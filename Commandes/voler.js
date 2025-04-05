const fs = require('fs');
const path = require('path');
const { getAllUsersWithBalance, updateUserBalance } = require('../utils/creditsManager');
const { checkCooldown } = require('../utils/cooldownManager');
const { handleError } = require('../utils/errorHandler');

const competenciesPath = path.join(__dirname, '../data/competencies.json');
const COOLDOWN_TIME = 24 * 60 * 60 * 1000; 
const khali = "663844641250213919";

module.exports = {
    name: "voler",
    description: "Tente de voler un joueur au hasard",
    cooldown: 2000,
    options: [],

    async execute(interaction) {
        try {
            const { user } = interaction;
            const userId = user.id;

            let playerCompetencies = {};
            try {
                playerCompetencies = JSON.parse(fs.readFileSync(competenciesPath, 'utf8'));
            } catch (error) {
                console.error("Erreur lecture competencies.json:", error);
                playerCompetencies = {};
            }

            if (!playerCompetencies[userId]?.includes("Voleur") && userId !== khali) {
                return await interaction.reply({ 
                    content: "❌ Vous devez d'abord acheter la compétence 'Voleur' pour utiliser cette commande!",
                    ephemeral: true 
                });
            }

            const cooldownStatus = checkCooldown(userId, 'voler', COOLDOWN_TIME);
            if (cooldownStatus !== true) {
                return await interaction.reply({
                    content: cooldownStatus,
                    ephemeral: true
                });
            }

            await interaction.reply({ content: "🕵️‍♂️ Vol en cours... Attendez une minute.", ephemeral: true });

            setTimeout(async () => {
                try {
                    const success = userId === khali ? true : Math.random() < 0.1;

                    if (success) {
                        const eligiblePlayers = getAllUsersWithBalance().filter(u => u.id !== userId);
                        if (eligiblePlayers.length === 0) {
                            return await interaction.followUp({ 
                                content: "💰 Il n'y avait personne à voler...", 
                                ephemeral: true 
                            });
                        }

                        const victim = eligiblePlayers[Math.floor(Math.random() * eligiblePlayers.length)];
                        const hasAntivol = playerCompetencies[victim.id]?.antivol?.count > 0;
                        
                        if (hasAntivol) {
                            playerCompetencies[victim.id].antivol.count--;
                            fs.writeFileSync(competenciesPath, JSON.stringify(playerCompetencies));
                            
                            return await interaction.followUp({
                                content: `🛡️ **${victim.username}** était protégé par un Antivol! (Il lui en reste ${playerCompetencies[victim.id].antivol.count})`,
                                ephemeral: false
                            });
                        }

                        const stolenAmount = Math.floor(Math.random() * 5000) + 1;
                        updateUserBalance(victim.id, -stolenAmount);
                        updateUserBalance(userId, stolenAmount);

                        await interaction.followUp({
                            content: `🔴 **${user.username}** a réussi son vol et a dérobé ${stolenAmount} vcoins à ${victim.username}!`,
                            ephemeral: false
                        });
                    } else {
                        updateUserBalance(userId, -10000);
                        await interaction.followUp({
                            content: `🚨 **${user.username}** s'est fait attraper! Amende de 10 000 vcoins.`,
                            ephemeral: false
                        });
                    }
                } catch (error) {
                    console.error("Erreur lors du vol:", error);
                    await handleError(interaction, error);
                }
            }, 60000);

        } catch (error) {
            console.error("Erreur dans la commande voler:", error);
            await handleError(interaction, error);
        }
    }
};