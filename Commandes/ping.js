const { MessageFlags } = require("discord.js");

module.exports = {
    name: "ping",
    description: "Affiche la latence du bot",

    async execute(interaction) {
        await interaction.reply(`🏓 Pong ! Latence : \`${interaction.client.ws.ping}ms\``); // 🔹 Pas d'option ephemeral
    }
};

