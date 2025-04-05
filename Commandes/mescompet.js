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

            const competences = playerCompetencies[userId] || [];
            
            const embed = new EmbedBuilder()
                .setColor('#0099ff')
                .setTitle('📜 Vos Compétences')
                .setThumbnail(interaction.user.displayAvatarURL())
                .setTimestamp()
                .setFooter({ text: `Demandé par ${interaction.user.username}` });

            if (competences.length === 0) {
                embed.setDescription('❌ Vous ne possédez aucune compétence actuellement.')
                   .setFooter({ text: 'Utilisez /achetercompet pour en acquérir' });
            } 
            else {
                const emojis = {
                    voleur: '🕵️‍♂️',
                    travailleur: '💼',
                    antivol: '🛡️',
                    default: '🔹'
                };

                embed.setDescription('Voici la liste de vos compétences :')
                     .addFields(
                         competences.map(comp => {
                             const compLower = comp.toLowerCase();
                                 
                             if (compLower === 'antivol') {
                                const antivolData = playerCompetencies[userId]?.antivol || { count: 0 };
                                return {
                                    name: `${emojis.antivol} ${comp}`,
                                    value: `Protections: ${antivolData.count}/3`,
                                    inline: false
                                };
                            }
                             
                             return {
                                 name: `${emojis[compLower] || emojis.default} ${comp}`,
                                 value: '\u200B',
                                 inline: false
                             };
                         })
                     );
            }

            await interaction.reply({ 
                embeds: [embed], 
                flags: 1 << 6
            });

        } catch (error) {
            console.error("Erreur dans mescompet:", error);
            const errorEmbed = new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle('❌ Erreur')
                .setDescription('Une erreur est survenue lors de la récupération de vos compétences.');
            
            await interaction.reply({ 
                embeds: [errorEmbed], 
                flags: 1 << 6 
            });
        }
    }
};