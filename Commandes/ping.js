const { MessageFlags } = require("discord.js");
const { handleError } = require("../utils/errorHandler");
const { checkCooldown } = require("../utils/cooldownManager");
const { cooldown } = require("./matches");

module.exports = {
    name: "ping",
    cooldown: 2000,
    description: "Affiche la latence du bot",

    async execute(interaction) {

        const cooldownResult = checkCooldown(interaction.user.id, this.name, this.cooldown);
        if (cooldownResult !== true) {
            return interaction.reply({ content: cooldownResult, ephemeral: true });
        }

        try {
            await interaction.reply(`🏓 Pong ! Latence : \`${interaction.client.ws.ping}ms\``); 
        } catch (error) {
            await handleError(interaction, error);
        }
    }
};