const fs = require('fs');
const path = require('path');
const { EmbedBuilder } = require('discord.js');

const competenciesPath = path.join(__dirname, '../data/competencies.json');

module.exports = {
    name: "mescompet",
    description: "Affiche vos compétences",
    cooldown: 2000,
    options: [],

    async execute(interaction) {
        try {
            const userId = interaction.user.id;
            let playerCompetencies = {};

            try {
                playerCompetencies = JSON.parse(fs.readFileSync(competenciesPath, 'utf8'));
            } catch (error) {
                console.error("Erreur lecture competencies.json:", error);
                playerCompetencies = {};
            }

            const userData = playerCompetencies[userId] || { competences: [], antivol: { count: 0 } };
            const competences = userData.competences || [];
            
            const embed = new EmbedBuilder()
                .setColor('#0099ff')
                .setTitle('📜 Vos Compétences')
                .setThumbnail(interaction.user.displayAvatarURL())
                .setTimestamp()
                .setFooter({ text: interaction.user.username });

            if (competences.length === 0) {
                embed.setDescription('❌ Vous ne possédez aucune compétence actuellement.');
            } else {
                const emojis = {
                    voleur: '🕵️‍♂️',
                    travailleur: '💼',
                    antivol: '🛡️',
                    default: '🔹'
                };

                const fields = competences.map(comp => {
                    const compLower = comp.toLowerCase();
                    if (compLower === 'antivol') {
                        return {
                            name: `${emojis.antivol} ${comp}`,
                            value: `Protections: ${userData.antivol.count}/3`,
                            inline: false
                        };
                    }
                    return {
                        name: `${emojis[compLower] || emojis.default} ${comp}`,
                        value: '\u200B',
                        inline: false
                    };
                });

                embed.setDescription('Voici vos compétences:').addFields(fields);
            }

            await interaction.reply({ embeds: [embed], ephemeral: true });

        } catch (error) {
            console.error("Erreur dans mescompet:", error);
            await interaction.reply({
                content: "❌ Une erreur est survenue",
                ephemeral: true
            });
        }
    }
};