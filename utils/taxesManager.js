const fs = require('fs');
const path = require('path');
const { getAllUsersWithBalance, updateUserBalance, getUserBalance } = require('./creditsManager');

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
    
    if (now - taxData.lastTaxation < TAX_COOLDOWN) return false;

    const allUsers = getAllUsersWithBalance();
    const taxableUsers = allUsers.filter(u => u.balance >= TAX_THRESHOLD);
    
    if (taxableUsers.length === 0) return false;

    const taxReports = [];
    const guild = bot.guilds.cache.get('1283354646567456799');
    for (const user of taxableUsers) {
        try {
            let username = `ID:${user.id.slice(0,6)}`;
            if (guild) {
                const member = await guild.members.fetch(user.id).catch(() => null);
                if (member) username = member.user.username;
            }
    
            let taxAmount = Math.floor(user.balance * TAX_RATE);
            const offshoreProtected = playerCompetencies[user.id]?.competences?.includes("Offshore");
            
            if (offshoreProtected) {
                const protectedAmount = Math.floor(user.balance * 0.5);
                taxAmount = Math.floor((user.balance - protectedAmount) * TAX_RATE);
            }
    
            updateUserBalance(user.id, -taxAmount);
            
            taxReports.push({
                userId: user.id,
                username: username,
                amount: taxAmount,
                oldBalance: user.balance,
                newBalance: user.balance - taxAmount,
                offshoreProtected: offshoreProtected
            });
    
            try {
                let dmMessage = `💸 **Alerte Fiscale**\n` +
                               `Vous avez été taxé de **${taxAmount} VCOINS** (2% de votre solde${offshoreProtected ? ' après protection offshore' : ''}).\n` +
                               `Nouveau solde: **${user.balance - taxAmount} VCOINS**`;
                
                if (offshoreProtected) {
                    dmMessage += `\n\n🛡️ Votre compte offshore a protégé une partie de votre argent!`;
                }
    
                await bot.users.send(user.id, dmMessage);
            } catch (dmError) {
                console.error(`Erreur DM pour ${username}:`, dmError);
            }
        } catch (error) {
            console.error(`Erreur traitement ${user.id}:`, error);
        }
    }

    taxData.lastTaxation = now;
    taxReports.forEach(report => {
        taxData.taxedUsers[report.userId] = report;
    });
    saveTaxData(taxData);

    const logChannel = bot.channels.cache.get('1322904141164445727');
    if (logChannel && taxReports.length > 0) {
        const totalTaxed = taxReports.reduce((sum, r) => sum + r.amount, 0);
        const taxList = taxReports.map(r => 
            `- **${r.username}**: ${r.amount} VCOINS (${r.oldBalance} → ${r.newBalance})`
        ).join('\n');

        await logChannel.send({
            embeds: [{
                color: 0xFFA500,
                title: '📊 Rapport Fiscal Complet',
                description: `**Total collecté**: ${totalTaxed} VCOINS\n` +
                            `**Joueurs taxés**: ${taxReports.length}\n\n${taxList}`,
                footer: { text: `Prochaine taxation dans 24h` }
            }]
        }).catch(console.error);
    }

    return true;
}

module.exports = { applyRandomTax, loadTaxData };