const { MessageFlags } = require("discord.js");
const { handleError } = require("../utils/errorHandler");

module.exports = {
    name: "ping",
    description: "Affiche la latence du bot",

    async execute(interaction) {
        try {
            await interaction.reply(`🏓 Pong ! Latence : \`${interaction.client.ws.ping}ms\``); // 🔹 Pas d'option ephemeral
        } catch (error) {
            await handleError(interaction, error);
        }
    }
};