const fs = require('fs');
const path = require('path');
const { getAllUsersWithBalance, updateUserBalance } = require('./creditsManager');

const TAXES_LOG_PATH = path.join(__dirname, '../data/taxes_log.json');
const TAX_THRESHOLD = 100000;
const TAX_RATE = 0.02;
const TAX_COOLDOWN = 24 * 60 * 60 * 1000; 

function loadTaxData() {
    try {
        return JSON.parse(fs.readFileSync(TAXES_LOG_PATH, 'utf8'));
    } catch {
        return { lastTaxation: 0, taxedUsers: {} };
    }
}

function saveTaxData(data) {
    fs.writeFileSync(TAXES_LOG_PATH, JSON.stringify(data, null, 2));
}

async function applyRandomTax(bot) {
    const taxData = loadTaxData();
    const now = Date.now();
    
    if (now - taxData.lastTaxation < TAX_COOLDOWN) return;

    const allUsers = getAllUsersWithBalance();
    const taxableUsers = allUsers.filter(u => u.balance >= TAX_THRESHOLD);
    
    if (taxableUsers.length === 0) return;

    const taxCount = Math.min(3, Math.max(1, Math.floor(taxableUsers.length * 0.2)));
    const shuffled = [...taxableUsers].sort(() => 0.5 - Math.random());
    const selected = shuffled.slice(0, taxCount);

    const taxReports = [];
    for (const user of selected) {
        const taxAmount = Math.floor(user.balance * TAX_RATE);
        updateUserBalance(user.id, -taxAmount);
        
        taxReports.push({
            userId: user.id,
            username: user.username,
            amount: taxAmount,
            date: now
        });

        try {
            const dm = await bot.users.createDM(user.id);
            await dm.send(`💸 **Alerte fiscale !**\nVous avez été taxé de ${taxAmount} VCOINS (2% de votre solde).`);
        } catch (error) {
            console.error(`Erreur DM pour ${user.username}:`, error);
        }
    }

    taxData.lastTaxation = now;
    taxReports.forEach(report => {
        taxData.taxedUsers[report.userId] = report;
    });
    saveTaxData(taxData);

    const taxList = taxReports.map(r => `- ${r.username}: ${r.amount} VCOINS`).join('\n');
    const logChannel = bot.channels.cache.get('1322904141164445727');
    if (logChannel) {
        await logChannel.send({
            embeds: [{
                color: 0xFFA500,
                title: '📊 Rapport fiscal du jour',
                description: `Les joueurs suivants ont contribué aux finances publiques :\n${taxList}`,
                footer: { text: `Prochaine taxation dans 24h` }
            }]
        });
    }
}

module.exports = { applyRandomTax };