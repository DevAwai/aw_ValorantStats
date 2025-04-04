const fs = require('fs');
const path = require('path');
const { EmbedBuilder } = require('discord.js');
const { updateUserBalance, getUserBalance } = require('../utils/creditsManager');
const { checkCooldown } = require('../utils/cooldownManager');

const competenciesPath = path.join(__dirname, '../data/competencies.json');
const WORK_COOLDOWN = 2 * 60 * 60 * 1000;
const MIN_EARN = 800;
const MAX_EARN = 3000;

module.exports = {
    name: "travailler",
    description: "Effectuez un travail pour gagner des vcoins",
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
                    content: "❌ Vous devez acheter la compétence 'Travailleur' pour utiliser cette commande!",
                    ephemeral: true
                });
            }

            const cooldownStatus = checkCooldown(userId, 'travailler', WORK_COOLDOWN);
            if (cooldownStatus !== true) {
                return await interaction.reply({ 
                    content: cooldownStatus,
                    ephemeral: true 
                });
            }

            const earnings = Math.floor(Math.random() * (MAX_EARN - MIN_EARN + 1)) + MIN_EARN;
            updateUserBalance(userId, earnings);

            const embed = new EmbedBuilder()
                .setColor('#4CAF50')
                .setTitle('💼 Travail effectué')
                .setDescription(`Vous avez gagné **${earnings} vcoins**!`)
                .addFields(
                    { name: 'Nouveau solde', value: `${getUserBalance(userId)} vcoins`, inline: true },
                    { name: 'Prochain travail possible', value: `Dans 2 heures`, inline: true }
                )
                .setFooter({ text: 'Revenez plus tard pour travailler à nouveau' });

            await interaction.reply({ embeds: [embed], ephemeral: true });

        } catch (error) {
            console.error("Erreur dans travailler:", error);
            await interaction.reply({ 
                content: "❌ Une erreur est survenue lors de l'exécution du travail",
                ephemeral: true 
            });
        }
    }
};