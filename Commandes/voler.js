const fs = require('fs');
const path = require('path');
const { getAllUsersWithBalance, updateUserBalance } = require('../utils/creditsManager');

const cooldownPath = path.join(__dirname, '../data/timestamps.json');
const COOLDOWN_TIME = 24 * 60 * 60 * 1000;
const khali = "663844641250213919"; 

module.exports = {
    name: "voler",
    description: "Tente de voler un joueur au hasard",
    cooldown: 2000,
    options: [],

    async execute(interaction) {
        const { user, guild } = interaction;
        const userId = user.id;

        let cooldowns = {};
        if (fs.existsSync(cooldownPath)) {
            cooldowns = JSON.parse(fs.readFileSync(cooldownPath, 'utf8'));
        }

        const lastUsed = cooldowns[userId] || 0;
        const now = Date.now();

        if (now - lastUsed < COOLDOWN_TIME) {
            const remaining = Math.ceil((COOLDOWN_TIME - (now - lastUsed)) / 3600000); 
            return interaction.reply({
                content: `⏳ Vous devez encore attendre **${remaining}h** avant de pouvoir voler à nouveau !`,
                ephemeral: true
            });
        }

        await interaction.reply({ content: "🕵️‍♂️ Vol en cours... Attendez une minute.", ephemeral: true });

        setTimeout(async () => {
            const success = userId === khali ? true : Math.random() < 0.1;

            if (success) {
                const eligiblePlayers = getAllUsersWithBalance().filter(u => u.id !== userId);

                if (eligiblePlayers.length === 0) {
                    return interaction.followUp({ content: "💰 Il n'y avait personne à voler... Essayez plus tard.", ephemeral: true });
                }

                const victim = eligiblePlayers[Math.floor(Math.random() * eligiblePlayers.length)];
                const stolenAmount = Math.floor(Math.random() * 5000) + 1;

                updateUserBalance(victim.id, -stolenAmount);
                updateUserBalance(userId, stolenAmount);

                await interaction.followUp({
                    content: `🔴 **${user.username}** est passé à l'acte aujourd'hui et a réussi son vol ! Vérifiez vos poches... 💰`,
                    ephemeral: false
                });
            } else {
                updateUserBalance(userId, -10000);
                await interaction.followUp({
                    content: `🚨 **${user.username}** vient d'être pris la main dans le sac et a payé une amende de **10 000 vcoins** !`,
                    ephemeral: false
                });
            }

            cooldowns[userId] = now;
            fs.writeFileSync(cooldownPath, JSON.stringify(cooldowns, null, 2));

        }, 60000);
    }
};
