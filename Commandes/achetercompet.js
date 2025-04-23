const { getUserBalance, updateUserBalance } = require('../utils/creditsManager');
const { loadCompetencies, saveCompetencies } = require('../utils/competenciesManager');
const { EmbedBuilder } = require('discord.js');

const COMPETENCES = {
    "Voleur": { price: 10000, emoji: "🕵️‍♂️" },
    "Travailleur": { price: 15000, emoji: "💼" },
    "Antivol": { price: 10000, emoji: "🛡️", max: 3 },
    "Chômeur": { price: 20000, emoji: "🛌" },
    "Offshore": { price: 50000, emoji: "🏦", max: 1 }
};

module.exports = {
    name: "achetercompet",
    description: "Acheter une compétence",
    cooldown: 2000,
    utilisation: "/achetercompet",
    options: [
        {
            type: "string",
            name: "competence",
            description: "La compétence à acheter",
            required: true,
            choices: Object.keys(COMPETENCES).map(comp => ({
                name: `${comp} (${COMPETENCES[comp].price} vcoins)`,
                value: comp.toLowerCase()
            }))
        }
    ],
    
    async execute(interaction) {
        try {
            const userId = interaction.user.id;
            const competenceInput = interaction.options.getString("competence").toLowerCase();

            const [competenceName, competenceData] = Object.entries(COMPETENCES)
                .find(([name]) => name.toLowerCase() === competenceInput) || [];
            
            if (!competenceName) {
                return interaction.reply({ 
                    content: "❌ Cette compétence n'existe pas!", 
                    ephemeral: true 
                });
            }

            const playerCompetencies = await loadCompetencies();
            const userCompetencies = playerCompetencies[userId] || { 
                competences: [], 
                antivol: { count: 0 } 
            };

            if (competenceName === "Chômeur" && userCompetencies.competences.includes("Travailleur")) {
                return interaction.reply({ 
                    content: "❌ Vous ne pouvez pas être Chômeur si vous avez la compétence Travailleur!",
                    ephemeral: true
                });
            }

            if (competenceName === "Travailleur" && userCompetencies.competences.includes("Chômeur")) {
                return interaction.reply({
                    content: "❌ Vous devez d'abord abandonner votre statut de Chômeur!",
                    ephemeral: true
                });
            }

            if (competenceName === "Antivol" && userCompetencies.antivol.count >= competenceData.max) {
                return interaction.reply({ 
                    content: `❌ Vous avez déjà le maximum d'Antivols (${competenceData.max})!`, 
                    ephemeral: true 
                });
            }

            if (competenceName === "Offshore" && userCompetencies.competences.includes("Offshore")) {
                return interaction.reply({ 
                    content: "❌ Vous possédez déjà un compte offshore!", 
                    ephemeral: true 
                });
            }

            if (userCompetencies.competences.includes(competenceName) && competenceName !== "Antivol") {
                return interaction.reply({ 
                    content: "❌ Vous possédez déjà cette compétence!", 
                    ephemeral: true 
                });
            }

            const userBalance = getUserBalance(userId);
            if (userBalance < competenceData.price) {
                return interaction.reply({ 
                    content: `❌ Il vous faut ${competenceData.price} vcoins pour "${competenceName}"!`, 
                    ephemeral: true 
                });
            }

            updateUserBalance(userId, -competenceData.price);
            
            if (competenceName === "Antivol") {
                userCompetencies.antivol.count++;
                if (!userCompetencies.competences.includes("Antivol")) {
                    userCompetencies.competences.push("Antivol");
                }
            } else {
                userCompetencies.competences.push(competenceName);
            }

            playerCompetencies[userId] = userCompetencies;
            await saveCompetencies(playerCompetencies);

            let replyMessage = `✅ Achat réussi! ${competenceData.emoji} **${competenceName}** pour **${competenceData.price} vcoins**.`;
            if (competenceName === "Antivol") {
                replyMessage += ` (${userCompetencies.antivol.count}/${competenceData.max})`;
            }

            await interaction.reply({ 
                content: replyMessage,
                ephemeral: true
            });

        } catch (error) {
            console.error("Erreur dans achetercompet:", error);
            await interaction.reply({
                content: "❌ Une erreur est survenue lors de l'achat",
                ephemeral: true
            });
        }
    }
};