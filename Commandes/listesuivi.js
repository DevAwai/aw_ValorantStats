const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { loadTrackedPlayers } = require("../utils/trackedPlayers");
const { handleError } = require("../utils/errorHandler");
const { checkCooldown } = require("../utils/cooldownManager");
const { cooldown } = require("./matches");

module.exports = {
    name: "listesuivi",
    description: "Affiche la liste des joueurs suivis par le bot",
    cooldown: 2000,
    permissions: "Aucune",
    dm: false,

    async execute(interaction) {

        const cooldownResult = checkCooldown(interaction.user.id, this.name, this.cooldown);
        if (cooldownResult !== true) {
            return interaction.reply({ content: cooldownResult, ephemeral: true });
        }

        try {
            const trackedPlayers = loadTrackedPlayers();

            if (trackedPlayers.length === 0) {
                return interaction.reply({
                    content: "❌ Aucun joueur n'est actuellement suivi.",
                    ephemeral: true,
                });
            }

            const embed = new EmbedBuilder()
                .setTitle("📋 Liste des joueurs suivis")
                .setColor("#3498db")
                .setDescription(
                    trackedPlayers
                        .map((player, index) => `**${index + 1}.** ${player.name}#${player.tag}`)
                        .join("\n")
                )
                .setFooter({ text: `Demandé par ${interaction.user.username}`, iconURL: interaction.user.displayAvatarURL() })
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });
        } catch (error) {
            await handleError(interaction, error);
        }
    },
};