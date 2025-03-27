const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { loadTrackedPlayers } = require("../utils/trackedPlayers");
const { handleError } = require("../utils/errorHandler");

module.exports = {
    name: "listesuivi",
    description: "Affiche la liste des joueurs suivis par le bot",
    permissions: "Aucune",
    dm: false,

    async execute(interaction) {
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
                .setFooter({ text: `Total : ${trackedPlayers.length} joueur(s)` })
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });
        } catch (error) {
            await handleError(interaction, error);
        }
    },
};