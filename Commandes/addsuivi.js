const { SlashCommandBuilder } = require("discord.js");
const { loadTrackedPlayers, saveTrackedPlayers } = require("../utils/trackedPlayers");
const { handleError } = require("../utils/errorHandler");
const { checkCooldown } = require("../utils/cooldownManager"); 

module.exports = {
    name: "addsuivi",
    description: "Ajoute un joueur à la liste des surveillés",
    cooldown: 2000,
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
        try {
            const cooldownResult = checkCooldown(interaction.user.id, this.name, this.cooldown);
            if (cooldownResult !== true) {
                return interaction.reply({ content: cooldownResult, ephemeral: true });
            }

            const pseudo = interaction.options.getString("pseudo");
            const [name, tag] = pseudo.split("#");

            if (!name || !tag) {
                return interaction.reply({
                    content: "❌ Format invalide! Utilisez **Pseudo#Tag**.",
                    ephemeral: true
                });
            }

            const trackedPlayers = loadTrackedPlayers();
            const playerExists = trackedPlayers.some(p => p.name === name && p.tag === tag);

            if (playerExists) {
                return interaction.reply({
                    content: "❌ Ce joueur est déjà surveillé.",
                    ephemeral: true
                });
            }

            trackedPlayers.push({ name, tag, lastMatchId: null });
            saveTrackedPlayers(trackedPlayers);

            await interaction.reply({
                content: `✅ **${name}#${tag}** a été ajouté à la liste des surveillés.`,
                ephemeral: true
            });

        } catch (error) {
            await handleError(interaction, error, "API");
        }
    }
};
