const { getUserBalance, updateUserBalance, getAllUsersWithBalance } = require('../utils/creditsManager');
const fs = require('fs');

module.exports = {
    name: "voler",
    description: "Tente de voler un joueur au hasard",
    cooldown: 2000,
    options: [],

    async execute(interaction) {
        const { user, guild } = interaction;
        const userId = user.id;

        let playerCompetencies = {};
        try {
            playerCompetencies = JSON.parse(fs.readFileSync('./data/competencies.json', 'utf8'));
        } catch (error) {
            playerCompetencies = {};
        }

        if (!playerCompetencies[userId] || !playerCompetencies[userId].includes("Voleur")) {
            return interaction.reply({ content: "Vous n'avez pas la compétence **Voleur** pour effectuer cette action!", ephemeral: true });
        }

        await interaction.reply({ content: "🕵️‍♂️ Vol en cours... Attendez une minute.", ephemeral: true });

        setTimeout(async () => {
            const success = Math.random() < 0.1;

            if (success) {
                const eligiblePlayers = getAllUsersWithBalance(guild.id).filter(u => u.id !== userId && u.balance > 0);
                
                if (eligiblePlayers.length === 0) {
                    return interaction.followUp({ content: "💰 Il n'y avait personne à voler... Essayez plus tard.", ephemeral: true });
                }

                const victim = eligiblePlayers[Math.floor(Math.random() * eligiblePlayers.length)];
                const stolenAmount = Math.floor(Math.random() * 5000) + 1; 

                updateUserBalance(victim.id, -stolenAmount);
                updateUserBalance(userId, stolenAmount);

                await interaction.followUp({
                    content: `🔴 **${user.username}** est passé à l'acte aujourd'hui ! Vérifiez vos poches... 💰`,
                    ephemeral: false
                });
            } else {
                updateUserBalance(userId, -10000);

                await interaction.followUp({
                    content: `🚨 **${user.username}** vient d'être pris la main dans le sac et a payé une amende de **10 000 vcoins** !`,
                    ephemeral: false
                });
            }
        }, 60000);
    }
};
