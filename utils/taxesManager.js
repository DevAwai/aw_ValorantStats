const fs = require('fs').promises;
const path = require('path');
const { getAllUsersWithBalance, updateUserBalance } = require('./creditsManager');
const { loadCompetencies } = require('../utils/competenciesManager');
const {
    TAXES_LOG_PATH,
    TAX_THRESHOLD,
    TAX_RATE,
    TAX_COOLDOWN,
    GUILD_ID,
    LOG_CHANNEL_ID
} = require('../config');

async function loadTaxData() {
    try {
        const data = await fs.readFile(TAXES_LOG_PATH, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        if (error.code === 'ENOENT') {
            return { lastTaxation: 0, taxedUsers: {} };
        }
        throw error;
    }
}

async function saveTaxData(data) {
    await fs.writeFile(TAXES_LOG_PATH, JSON.stringify(data, null, 2));
}

async function applyTaxToUser(bot, user, competenciesData, guild) {
    const username = await getUsername(bot, guild, user.id);
    const offshoreProtected = competenciesData[user.id]?.competences?.includes("Offshore");
    const taxAmount = calculateTax(user.balance, offshoreProtected);

    updateUserBalance(user.id, -taxAmount);
    
    try {
        await sendTaxNotification(bot, user.id, taxAmount, user.balance - taxAmount, offshoreProtected);
    } catch (error) {
        console.error(`Failed to send DM to ${user.id}:`, error);
    }

    return {
        userId: user.id,
        username,
        amount: taxAmount,
        oldBalance: user.balance,
        newBalance: user.balance - taxAmount,
        offshoreProtected
    };
}

async function applyRandomTax(bot) {
    try {
        const [taxData, allUsers, competenciesData] = await Promise.all([
            loadTaxData(),
            getAllUsersWithBalance(),
            loadCompetencies()
        ]);

        if (Date.now() - taxData.lastTaxation < TAX_COOLDOWN) return false;

        const taxableUsers = allUsers.filter(u => u.balance >= TAX_THRESHOLD);
        if (taxableUsers.length === 0) return false;

        const guild = bot.guilds.cache.get(GUILD_ID);
        const taxReports = await Promise.all(
            taxableUsers.map(user => 
                applyTaxToUser(bot, user, competenciesData, guild)
                    .catch(error => {
                        console.error(`Taxation failed for ${user.id}:`, error);
                        return null;
                    })
            )
        );

        const successfulReports = taxReports.filter(report => report !== null);
        
        await saveTaxData({
            lastTaxation: Date.now(),
            taxedUsers: {
                ...taxData.taxedUsers,
                ...Object.fromEntries(successfulReports.map(r => [r.userId, r]))
            }
        });

        await sendTaxSummary(bot, successfulReports);
        return true;
    } catch (error) {
        console.error('Error in applyRandomTax:', error);
        return false;
    }
}

async function getUsername(bot, guild, userId) {
    if (!guild) return `ID:${userId.slice(0, 6)}`;
    try {
        const member = await guild.members.fetch(userId);
        return member.user.username;
    } catch {
        return `ID:${userId.slice(0, 6)}`;
    }
}

function calculateTax(balance, offshoreProtected) {
    const taxableAmount = offshoreProtected ? balance * 0.5 : balance;
    return Math.floor(taxableAmount * TAX_RATE);
}

async function sendTaxNotification(bot, userId, amount, newBalance, offshoreProtected) {
    let message = `💸 **Alerte Fiscale**\nVous avez été taxé de **${amount} VCOINS**`;
    if (offshoreProtected) message += ` (après protection offshore)`;
    message += `.\nNouveau solde: **${newBalance} VCOINS**`;
    
    if (offshoreProtected) message += `\n\n🛡️ Votre compte offshore a protégé une partie de votre argent!`;
    
    await bot.users.send(userId, message);
}

async function sendTaxSummary(bot, reports) {
    if (reports.length === 0) return;

    const logChannel = bot.channels.cache.get(LOG_CHANNEL_ID);
    if (!logChannel) return;

    const totalTaxed = reports.reduce((sum, r) => sum + r.amount, 0);
    const taxList = reports.map(r => 
        `- **${r.username}**: ${r.amount} VCOINS (${r.oldBalance} → ${r.newBalance})` +
        (r.offshoreProtected ? ' 🏦 (offshore)' : '')
    ).join('\n');

    await logChannel.send({
        embeds: [{
            color: 0xFFA500,
            title: '📊 Rapport Fiscal Complet',
            description: `**Total collecté**: ${totalTaxed} VCOINS\n` +
                        `**Joueurs taxés**: ${reports.length}\n\n${taxList}`,
            footer: { text: `Prochaine taxation dans 24h` }
        }]
    });
}

function scheduleDailyTax(bot) {
    const execute = () => {
        applyRandomTax(bot)
            .then(success => success && console.log("💰 Taxation quotidienne effectuée"))
            .catch(console.error);
    };

    const now = new Date();
    const nextTax = new Date();
    nextTax.setHours(24, 0, 0, 0);

    const initialDelay = nextTax - now;
    setTimeout(() => {
        execute();
        setInterval(execute, 24 * 60 * 60 * 1000); 
    }, initialDelay);
}

module.exports = { 
    applyRandomTax, 
    loadTaxData,
    scheduleDailyTax
};