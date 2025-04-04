const fs = require('fs');
const path = require('path');
const { EmbedBuilder } = require('discord.js');
const { checkCooldown } = require('../utils/cooldownManager');

const cooldownPath = path.join(__dirname, '../data/timestamps.json');
const competenciesPath = path.join(__dirname, '../data/competencies.json');
const WORK_COOLDOWN = 2 * 60 * 60 * 1000; 
const VOLER_COOLDOWN = 24 * 60 * 60 * 1000;

function formatDuration(ms) {
    const seconds = Math.floor(ms / 1000) % 60;
    const minutes = Math.floor(ms / (1000 * 60)) % 60;
    const hours = Math.floor(ms / (1000 * 60 * 60)) % 24;
    const days = Math.floor(ms / (1000 * 60 * 60 * 24));

    if (days > 0) return `${days}j ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    if (minutes > 0) return `${minutes}m ${seconds}s`;
    return `${seconds}s`;
}

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

            let cooldowns = {};
            try {
                if (fs.existsSync(cooldownPath)) {
                    cooldowns = JSON.parse(fs.readFileSync(cooldownPath, 'utf8'));
                }
            } catch (error) {
                console.error("Erreur lecture timestamps.json:", error);
            }

            const embed = new EmbedBuilder()
                .setColor('#0099ff')
                .setTitle('📜 Vos Compétences')
                .setThumbnail(interaction.user.displayAvatarURL())
                .setFooter({ text: `Demandé par ${interaction.user.username}` });

            for (const comp of competences) {
                const compLower = comp.toLowerCase();
                let value = '✅ Disponible';
                let emoji = '🔹';

                if (compLower === "voleur") {
                    emoji = '🕵️‍♂️';
                    const lastUsed = cooldowns[userId] || 0;
                    const remaining = VOLER_COOLDOWN - (Date.now() - lastUsed);
                    value = remaining <= 0 ? '✅ Prêt à voler' : `⏳ Disponible dans ${formatDuration(remaining)}`;
                } 
                else if (compLower === "travailleur") {
                    emoji = '💼';
                    const status = checkCooldown(userId, 'travail', WORK_COOLDOWN);
                    if (typeof status === 'string') {
                        const timeMatch = status.match(/(\d+\.?\d*)\s*(s|m|h|j)/);
                        value = timeMatch ? `⏳ Disponible dans ${timeMatch[1]}${timeMatch[2]}` : status;
                    } else {
                        value = status === true ? '✅ Prêt à travailler' : '⏳ En cooldown';
                    }
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