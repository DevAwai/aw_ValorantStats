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
        try {
            const discordUser = await bot.users.fetch(user.id);
            const username = discordUser?.username || `Joueur ${user.id.slice(0, 6)}`;

            const competencies = JSON.parse(fs.readFileSync('./data/competencies.json', 'utf8'));
            const hasOffshore = competencies[user.id]?.competences?.includes("Compte Offshore");

            let taxableAmount = user.balance;
            let protectedAmount = 0;

            if (hasOffshore) {
                protectedAmount = Math.floor(user.balance * 0.5);
                taxableAmount = user.balance - protectedAmount;
            }

            const taxAmount = Math.floor(taxableAmount * TAX_RATE);
            
            if (taxAmount > 0) {
                updateUserBalance(user.id, -taxAmount);
                
                taxReports.push({
                    userId: user.id,
                    username: username,
                    amount: taxAmount,
                    protected: protectedAmount
                });

                const taxMsg = hasOffshore
                    ? `💸 **Alerte fiscale !**\nTaxé: ${taxAmount} VCOINS (2% de ${taxableAmount} VCOINS)\n🛡️ **Protection offshore**: ${protectedAmount} VCOINS sauvegardés`
                    : `💸 **Alerte fiscale !**\nVous avez été taxé de ${taxAmount} VCOINS (2% de votre solde)`;

                await discordUser.send(taxMsg).catch(() => {});
            }
        } catch (error) {
            console.error(`Erreur taxation user ${user.id}:`, error);
        }
    }

    taxData.lastTaxation = now;
    taxReports.forEach(report => {
        taxData.taxedUsers[report.userId] = report;
    });
    saveTaxData(taxData);

    if (taxReports.length > 0) {
        const logChannel = bot.channels.cache.get('VOTRE_CHANNEL_LOG');
        if (logChannel) {
            const taxList = taxReports.map(r => 
                `- ${r.username}: ${r.amount} VCOINS` + 
                (r.protected > 0 ? ` (🛡️ ${r.protected} protégés)` : '')
            ).join('\n');

            await logChannel.send({
                embeds: [{
                    color: 0xFFA500,
                    title: '📊 Rapport fiscal du jour',
                    description: `Les joueurs suivants ont contribué :\n${taxList}`,
                    footer: { text: `Prochaine taxation dans 24h` }
                }]
            });
        }
    }
}

module.exports = { applyRandomTax };