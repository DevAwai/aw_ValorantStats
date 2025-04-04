const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { getUserBalance } = require("../utils/creditsManager");
const { handleError } = require("../utils/errorHandler");
const { checkCooldown } = require("../utils/cooldownManager");

module.exports = {
    name: "credit",
    description: "Affiche votre solde de crédits",
    cooldown: 2000,
    options: [],
    async execute(interaction) {
        const cooldownResult = checkCooldown(interaction.user.id, this.name, this.cooldown);
        if (cooldownResult !== true) {
            return interaction.reply({ content: cooldownResult, ephemeral: true });
        }

        try {
            const userId = interaction.user.id;
            const username = interaction.user.username;
            const balance = getUserBalance(userId);

            const embed = new EmbedBuilder()
                .setColor("#00FF00")
                .setTitle("💰 Solde de vos VCOINS")
                .setDescription(`**${username}**, vous avez actuellement **${balance}** VCOINS.`)
                .setThumbnail(interaction.user.displayAvatarURL())
                .setFooter({ text: "Casino Valorant Stats", iconURL: interaction.client.user.displayAvatarURL() })
                .setTimestamp();

            await interaction.reply({ embeds: [embed], ephemeral: false });
        } catch (error) {
            await handleError(interaction, error, "API");
        }
    }
};