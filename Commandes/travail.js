const { EmbedBuilder } = require('discord.js');
const { updateUserBalance, getUserBalance } = require('../utils/creditsManager');
const cooldownManager = require('../utils/cooldownManager');
const fs = require('fs');
const path = require('path');

const competenciesPath = path.join(__dirname, '../data/competencies.json');
const WORK_COOLDOWN = 2 * 60 * 60 * 1000;
const MIN_EARN = 800;
const MAX_EARN = 3000;

module.exports = {
    name: "travail",
    description: "Effectuez un travail pour gagner des vcoins",
    cooldown: 2000,
    options: [],

    async execute(interaction) {
        const userId = interaction.user.id;

        let playerCompetencies = {};
        try {
            playerCompetencies = JSON.parse(fs.readFileSync(competenciesPath, 'utf8'));
        } catch (error) {
            playerCompetencies = {};
        }

        if (!playerCompetencies[userId] || !playerCompetencies[userId].includes("Travailleur")) {
            return interaction.reply({
                content: "❌ Vous devez acheter la compétence 'Travailleur' pour utiliser cette commande!",
                ephemeral: true
            });
        }

        const cooldownMessage = cooldownManager.checkCooldown(userId, 'travail', WORK_COOLDOWN);
        if (cooldownMessage !== true) {
            return interaction.reply({ content: cooldownMessage, ephemeral: true });
        }

        const earnings = Math.floor(Math.random() * (MAX_EARN - MIN_EARN + 1)) + MIN_EARN;
        updateUserBalance(userId, earnings);

        const embed = new EmbedBuilder()
            .setColor('#4CAF50')
            .setTitle('💼 Travail effectué')
            .setDescription(`Vous avez gagné **${earnings} vcoins**!`)
            .addFields(
                { name: 'Nouveau solde', value: `${getUserBalance(userId)} vcoins`, inline: true },
                { name: 'Prochain travail possible', value: `<t:${Math.floor((Date.now() + WORK_COOLDOWN) / 1000)}:R>`, inline: true }
            )
            .setFooter({ text: 'Revenez dans 2 heures pour travailler à nouveau' });

        await interaction.reply({ embeds: [embed], ephemeral: true });
    } 
};
