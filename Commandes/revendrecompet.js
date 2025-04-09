const fs = require('fs');
const path = require('path');
const { EmbedBuilder } = require('discord.js');
const { updateUserBalance, getUserBalance } = require('../utils/creditsManager');

const COMPETENCIES_FILE = path.join(__dirname, '../data/competencies.json');
const PRICES = {
    "Voleur": 5000,  
    "Travailleur": 4000, 
    "Antivol": 2500,    
    "Chômeur": 10000,   
    "Offshore": 25000   
};

module.exports = {
    name: "revendrecompet",
    description: "Revendre une compétence pour récupérer la moitié de son prix",
    cooldown: 5000,
    options: [
        {
            type: "string",
            name: "competence",
            description: "Compétence à revendre",
            required: true,
            choices: Object.keys(PRICES).map(comp => ({
                name: comp,
                value: comp.toLowerCase()
            }))
        }
    ],

    async execute(interaction) {
        try {
            const userId = interaction.user.id;
            const competenceInput = interaction.options.getString("competence").toLowerCase();

            let playerCompetencies = {};
            try {
                playerCompetencies = JSON.parse(fs.readFileSync(COMPETENCIES_FILE, 'utf8'));
            } catch (error) {
                console.error("Erreur lecture competencies.json:", error);
                return interaction.reply({
                    content: "❌ Aucune compétence trouvée à revendre",
                    ephemeral: true
                });
            }

            const userData = playerCompetencies[userId] || { competences: [], antivol: { count: 0 } };
            const competenceName = Object.keys(PRICES).find(
                name => name.toLowerCase() === competenceInput
            );

            if (!competenceName) {
                return interaction.reply({
                    content: "❌ Compétence invalide",
                    ephemeral: true
                });
            }

            if (!userData.competences.includes(competenceName)) {
                return interaction.reply({
                    content: `❌ Vous ne possédez pas la compétence "${competenceName}"`,
                    ephemeral: true
                });
            }

            if (competenceName === "Antivol") {
                if (userData.antivol.count === 0) {
                    return interaction.reply({
                        content: "❌ Vous n'avez aucun Antivol à revendre",
                        ephemeral: true
                    });
                }
                
                const refund = PRICES["Antivol"] * userData.antivol.count;
                updateUserBalance(userId, refund);
                userData.antivol.count = 0;
                
                if (!userData.competences.includes("Antivol")) {
                    userData.competences.push("Antivol");
                }
            } else {
                const refund = PRICES[competenceName];
                updateUserBalance(userId, refund);
                
                userData.competences = userData.competences.filter(c => c !== competenceName);
                
                if (competenceName === "Chômeur" && userData.competences.includes("Travailleur")) {
                    userData.competences = userData.competences.filter(c => c !== "Travailleur");
                } else if (competenceName === "Travailleur" && userData.competences.includes("Chômeur")) {
                    userData.competences = userData.competences.filter(c => c !== "Chômeur");
                }
            }

            playerCompetencies[userId] = userData;
            fs.writeFileSync(COMPETENCIES_FILE, JSON.stringify(playerCompetencies, null, 2));

            const embed = new EmbedBuilder()
                .setColor('#00FF00')
                .setTitle('✅ Vente réussie')
                .setDescription(`Vous avez revendu **${competenceName}**`)
                .addFields(
                    { name: 'Remboursement', value: `${PRICES[competenceName]} vcoins`, inline: true },
                    { name: 'Compétences restantes', value: userData.competences.join(', ') || 'Aucune', inline: true }
                );

            await interaction.reply({ embeds: [embed], ephemeral: true });

        } catch (error) {
            console.error("Erreur dans revendrecompet:", error);
            await interaction.reply({
                content: "❌ Une erreur est survenue",
                ephemeral: true
            });
        }
    }
};