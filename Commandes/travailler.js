const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');
const competenciesPath = path.join(__dirname, '../data/competencies.json');

module.exports = {
    name: "travailler",
    description: "Choisissez un métier pour gagner des vcoins",
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

            if (!playerCompetencies[userId]?.includes("Travailleur")) {
                return await interaction.reply({
                    content: "❌ Vous devez acheter la compétence 'Travailleur' pour travailler!",
                    ephemeral: true
                });
            }

            const buttons = [
                new ButtonBuilder()
                    .setCustomId('work_PECHEUR')
                    .setLabel('Pêcheur')
                    .setEmoji('🎣')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('work_BUCHERON')
                    .setLabel('Bûcheron')
                    .setEmoji('🪓')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('work_CAMIONNEUR')
                    .setLabel('Camionneur')
                    .setEmoji('🚚')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('work_PETROLIER')
                    .setLabel('Pétrolier')
                    .setEmoji('⛽')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('work_LIVREUR')
                    .setLabel('Livreur')
                    .setEmoji('📦')
                    .setStyle(ButtonStyle.Primary)
            ];

            const row = new ActionRowBuilder().addComponents(buttons);

            const embed = new EmbedBuilder()
                .setColor('#FFA500')
                .setTitle('💼 Choisissez votre métier')
                .setDescription('Sélectionnez un métier pour commencer à travailler:')
                .addFields(
                    { name: '🎣 Pêcheur', value: 'Le poisson', inline: false },
                    { name: '🪓 Bûcheron', value: 'La bûche connard', inline: false },
                    { name: '🚚 Camionneur', value: 'Pouet Pouet Camion', inline: false },
                    { name: '⛽ Pétrolier', value: 'Je suis riche', inline: false },
                    { name: '📦 Livreur', value: 'Livreur de Tacos', inline: false }
                );

            await interaction.reply({ 
                embeds: [embed], 
                components: [row],
                ephemeral: true 
            });

        } catch (error) {
            console.error("Erreur dans travailler:", error);
            await interaction.reply({ 
                content: "❌ Une erreur est survenue lors du chargement des métiers",
                ephemeral: true 
            });
        }
    }
};