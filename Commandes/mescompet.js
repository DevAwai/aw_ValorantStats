const fs = require('fs');
const path = require('path');
const { EmbedBuilder } = require('discord.js');
const { checkCooldown } = require('../utils/cooldownManager');

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
            if (competences.length === 0) {
                const embed = new EmbedBuilder()
                    .setColor('#ff0000')
                    .setTitle('❌ Aucune compétence')
                    .setDescription('Vous ne possédez aucune compétence actuellement.')
                    .setFooter({ text: 'Utilisez /achetercompet pour en acquérir' });
                
                return await interaction.reply({ embeds: [embed], ephemeral: true });
            }

            const embed = new EmbedBuilder()
                .setColor('#0099ff')
                .setTitle('📜 Vos Compétences')
                .setThumbnail(interaction.user.displayAvatarURL());

            for (const comp of competences) {
                const compLower = comp.toLowerCase();
                let value, emoji;

                if (compLower === "voleur") {
                    emoji = '🕵️‍♂️';
                    const status = checkCooldown(userId, 'voler', 24 * 60 * 60 * 1000);
                    value = status === true ? '✅ Prêt à voler' : status;
                } 
                else if (compLower === "travailleur") {
                    emoji = '💼';
                    const status = checkCooldown(userId, 'travail', 2 * 60 * 60 * 1000);
                    value = status === true ? '✅ Prêt à travailler' : status;
                } 
                else {
                    emoji = '🔹';
                    value = '✅ Disponible';
                }

                embed.addFields({
                    name: `${emoji} ${comp}`,
                    value: value,
                    inline: true
                });
            }

            await interaction.reply({ embeds: [embed], ephemeral: true });

        } catch (error) {
            console.error("Erreur dans mescompet:", error);
            const errorEmbed = new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle('❌ Erreur')
                .setDescription('Une erreur est survenue lors de la récupération de vos compétences.');
            
            await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }
    }
};