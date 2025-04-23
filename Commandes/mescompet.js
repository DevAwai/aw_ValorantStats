const { loadCompetencies } = require('../utils/competenciesManager');
const { EmbedBuilder } = require('discord.js');

const COMPETENCE_EMOJIS = {
    "Voleur": "🕵️‍♂️",
    "Travailleur": "💼",
    "Antivol": "🛡️",
    "Chômeur": "🛌",
    "Offshore": "🏦"
};

module.exports = {
    name: "mescompet",
    description: "Affiche vos compétences",
    cooldown: 2000,
    utilisation: "/mescompet",
    options: [],

    async execute(interaction) {
        try {
            const userId = interaction.user.id;
            const playerCompetencies = await loadCompetencies();
            const userData = playerCompetencies[userId] || { competences: [], antivol: { count: 0 } };
            
            const embed = new EmbedBuilder()
                .setColor('#0099ff')
                .setTitle('📜 Vos Compétences')
                .setThumbnail(interaction.user.displayAvatarURL())
                .setFooter({ text: interaction.user.username })
                .setTimestamp();

            if (userData.competences.length === 0) {
                embed.setDescription('❌ Vous ne possédez aucune compétence actuellement.');
            } else {
                const fields = userData.competences.map(comp => {
                    const emoji = COMPETENCE_EMOJIS[comp] || "🔹";
                    let value = '\u200B';

                    if (comp === "Antivol") {
                        value = `Protections: ${userData.antivol.count}/3`;
                    } else if (comp === "Chômeur") {
                        value = 'Allocation: 5000 vcoins/5min (en ligne)';
                    } else if (comp === "Offshore") {
                        value = 'Protection fiscale: 50% du solde protégé';
                    }

                    return {
                        name: `${emoji} ${comp}`,
                        value: value,
                        inline: false
                    };
                });

                embed.setDescription('Voici vos compétences:').addFields(fields);
            }

            await interaction.reply({ embeds: [embed], ephemeral: true });

        } catch (error) {
            console.error("Erreur dans mescompet:", error);
            await interaction.reply({
                content: "❌ Une erreur est survenue lors de l'affichage de vos compétences",
                ephemeral: true
            });
        }
    }
};