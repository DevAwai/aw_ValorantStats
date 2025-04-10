const { EmbedBuilder } = require('discord.js');
const { updateUserBalance, getUserBalance } = require('../utils/creditsManager');
const { loadCompetencies, saveCompetencies } = require('../utils/competenciesManager');

const SELL_PRICES = {
    "Voleur": 5000,      
    "Travailleur": 7500,  
    "Antivol": 5000,      
    "Chômeur": 10000,     
    "Offshore": 25000     
};

module.exports = {
    name: "revendrecompet",
    description: "Revendre une compétence pour 50% de son prix d'achat",
    cooldown: 2000,
    options: [
        {
            type: "string",
            name: "competence",
            description: "Compétence à revendre",
            required: true,
            choices: Object.keys(SELL_PRICES).map(comp => ({
                name: `${comp} (${SELL_PRICES[comp]} vcoins)`,
                value: comp.toLowerCase()
            }))
        }
    ],

    async execute(interaction) {
        try {
            const userId = interaction.user.id;
            const competenceInput = interaction.options.getString("competence").toLowerCase();
            const competenceName = Object.keys(SELL_PRICES)
                .find(name => name.toLowerCase() === competenceInput);

            if (!competenceName) {
                return interaction.reply({
                    content: "❌ Compétence invalide",
                    ephemeral: true
                });
            }

            const playerCompetencies = await loadCompetencies();
            const userData = playerCompetencies[userId] || { 
                competences: [], 
                antivol: { count: 0 } 
            };

            const hasCompetence = competenceName === "Antivol" 
                ? userData.antivol.count > 0
                : userData.competences.includes(competenceName);

            if (!hasCompetence) {
                return interaction.reply({
                    content: `❌ Vous ne possédez pas la compétence "${competenceName}"`,
                    ephemeral: true
                });
            }

            const refund = competenceName === "Antivol"
                ? Math.floor(SELL_PRICES[competenceName] * userData.antivol.count * 0.5)
                : Math.floor(SELL_PRICES[competenceName] * 0.5);

            if (competenceName === "Antivol") {
                userData.antivol.count = 0;
                userData.competences = userData.competences.filter(c => c !== "Antivol");
            } else {
                userData.competences = userData.competences.filter(c => c !== competenceName);
                if (competenceName === "Chômeur") {
                    userData.competences = userData.competences.filter(c => c !== "Travailleur");
                } else if (competenceName === "Travailleur") {
                    userData.competences = userData.competences.filter(c => c !== "Chômeur");
                }
            }

            updateUserBalance(userId, refund);
            playerCompetencies[userId] = userData;
            await saveCompetencies(playerCompetencies);

            const remainingCompetences = competenceName === "Antivol" 
                ? `Antivol (${userData.antivol.count}/3)`
                : userData.competences.join(', ') || 'Aucune';

            const embed = new EmbedBuilder()
                .setColor('#4CAF50')
                .setTitle(`♻️ ${competenceName} vendue`)
                .setDescription(`Vous avez reçu ${refund} vcoins (50% du prix d'achat)`)
                .addFields(
                    { name: 'Nouveau solde', value: `${getUserBalance(userId)} vcoins`, inline: true },
                    { name: 'Compétences restantes', value: remainingCompetences, inline: true }
                );

            await interaction.reply({ embeds: [embed], ephemeral: true });

        } catch (error) {
            console.error("Erreur dans revendrecompet:", error);
            await interaction.reply({
                content: "❌ Une erreur est survenue lors de la revente",
                ephemeral: true
            });
        }
    }
};