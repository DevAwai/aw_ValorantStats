const fs = require('fs');
const path = require('path');
const { getAllUsersWithBalance, updateUserBalance } = require('../utils/creditsManager');
const { checkCooldown, setCooldown } = require('../utils/cooldownManager');
const { handleError } = require('../utils/errorHandler');

const COMPETENCIES_FILE = path.join(__dirname, '../data/competencies.json');
const COOLDOWN_TIME = 24 * 60 * 60 * 1000;
const khali = "663844641250213919";

let playerCompetencies = {};

function saveCompetencies() {
    fs.writeFileSync(COMPETENCIES_FILE, JSON.stringify(playerCompetencies, null, 2));
}

module.exports = {
    name: "voler",
    description: "Tente de voler un joueur au hasard",
    cooldown: 2000,
    options: [],

    async execute(interaction) {
        try {
            const { user } = interaction;
            const userId = user.id;

            try {
                const data = fs.readFileSync(COMPETENCIES_FILE, 'utf8');
                playerCompetencies = JSON.parse(data);
            } catch (error) {
                console.error("Erreur lecture competencies.json:", error);
                playerCompetencies = {};
            }

            const userData = playerCompetencies[userId] || {};
            const hasVoleur = userData.competences?.includes("Voleur") || userId === khali;

            if (!hasVoleur) {
                return await interaction.reply({
                    content: "❌ Vous devez d'abord acheter la compétence 'Voleur' pour utiliser cette commande!",
                    ephemeral: true
                });
            }

            const cooldownStatus = checkCooldown(userId, 'voler', COOLDOWN_TIME);
            if (typeof cooldownStatus === 'string') {
                return await interaction.reply({
                    content: cooldownStatus,
                    ephemeral: true
                });
            }

            setCooldown(userId, 'voler', COOLDOWN_TIME);

            await interaction.reply({
                content: "🕵️‍♂️ Vol en cours... Attendez une minute.",
                ephemeral: true
            });

            setTimeout(async () => {
                try {
                    const success = userId === khali ? true : Math.random() < 0.5;
                    const eligiblePlayers = getAllUsersWithBalance().filter(u => u.id !== userId);

                    if (success && eligiblePlayers.length > 0) {
                        const victim = eligiblePlayers[Math.floor(Math.random() * eligiblePlayers.length)];
                        const victimData = playerCompetencies[victim.id] || { antivol: { count: 0 } };

                        if (victimData.antivol?.count > 0) {
                            playerCompetencies[victim.id].antivol.count--;
                            saveCompetencies();

                            return await interaction.followUp({
                                content: `🛡️ ${victim.username} était protégé(e) par un Antivol! (${playerCompetencies[victim.id].antivol.count}/3 restants)`,
                                ephemeral: true
                            });
                        }

                        const stolenAmount = Math.floor(Math.random() * 5000) + 1;
                        updateUserBalance(victim.id, -stolenAmount);
                        updateUserBalance(userId, stolenAmount);

                        await interaction.followUp({
                            content: `🔴 ${user.username} a volé ${stolenAmount} vcoins à ${victim.username}!`,
                            ephemeral: false
                        });

                        await interaction.followUp({
                            content: `✅ Tu as volé ${stolenAmount} vcoins à ${victim.username} avec succès!`,
                            ephemeral: true
                        });
                    } else if (success) {
                        await interaction.followUp({
                            content: "💰 Personne à voler...",
                            ephemeral: true
                        });
                    } else {
                        updateUserBalance(userId, -10000);
                        await interaction.followUp({
                            content: `🚨 ${user.username} s'est fait attraper! Amende de 10 000 vcoins.`,
                            ephemeral: false
                        });
                    }
                } catch (error) {
                    console.error("Erreur:", error);
                    await interaction.followUp({
                        content: "❌ Erreur pendant le vol",
                        ephemeral: true
                    });
                }
            }, 60000);

        } catch (error) {
            console.error("Erreur dans la commande voler:", error);
            await interaction.reply({
                content: "❌ Erreur lors du traitement de la commande",
                ephemeral: true
            });
        }
    }
};