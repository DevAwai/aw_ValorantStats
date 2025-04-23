const { SlashCommandBuilder } = require("discord.js");
const { loadTrackedPlayers, saveTrackedPlayers } = require("../utils/trackedPlayers");
const { handleError } = require("../utils/errorHandler");
const { checkCooldown } = require("../utils/cooldownManager");
const { cooldown } = require("./matches");

module.exports = {
    name: "removesuivi",
    description: "Retire un joueur de la liste des surveillés",
    cooldown: 2000,
    utilisation: "/removesuivi",
    options: [
        {
            type: "string",
            name: "pseudo",
            description: "Le pseudo sous format Pseudo#Tag",
            permissions: "Aucune",
            dm: false,
            required: true
        }
    ],
    async execute(interaction) {

        const cooldownResult = checkCooldown(interaction.user.id, this.name, this.cooldown);
        if (cooldownResult !== true) {
            return interaction.reply({ content: cooldownResult, ephemeral: true });
        }

        try {
            const pseudo = interaction.options.getString("pseudo");
            const [name, tag] = pseudo.split("#");

            const trackedPlayers = loadTrackedPlayers();
            const playerIndex = trackedPlayers.findIndex(p => p.name === name && p.tag === tag);

            if (playerIndex === -1) {
                return interaction.reply({
                    content: "❌ Ce joueur n'est pas surveillé.",
                    ephemeral: true
                });
            }

            trackedPlayers.splice(playerIndex, 1);
            saveTrackedPlayers(trackedPlayers);

            await interaction.reply({
                content: `✅ **${name}#${tag}** a été retiré de la liste des surveillés.`,
                ephemeral: true
            });
        } catch (error) {
            await handleError(interaction, error);
        }
    }
};