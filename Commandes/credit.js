const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { getUserBalance } = require("../utils/creditsManager");
const { handleError } = require("../utils/errorHandler");

module.exports = {
    name: "credit",
    description: "Affiche votre solde de crédits",
    options: [],
    async execute(interaction) {
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
            await handleError(interaction, error);
        }
    }
};
