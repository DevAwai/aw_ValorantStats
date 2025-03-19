const { SlashCommandBuilder } = require("discord.js");
const { loadTrackedPlayers, saveTrackedPlayers } = require("../utils/trackedPlayers");

module.exports = {
    name: "addsuivi",
    description: "Ajoute un joueur à la liste des surveillés",
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
        const pseudo = interaction.options.getString("pseudo");
        const [name, tag] = pseudo.split("#");

        const trackedPlayers = loadTrackedPlayers();
        const playerExists = trackedPlayers.some(p => p.name === name && p.tag === tag);

        if (playerExists) {
            return interaction.reply({
                content: "❌ Ce joueur est déjà surveillé.",
                ephemeral: true
            });
        }

        trackedPlayers.push({ name, tag, lastMatchesPlayed: 0 });
        saveTrackedPlayers(trackedPlayers);

        await interaction.reply({
            content: `✅ **${name}#${tag}** a été ajouté à la liste des surveillés.`,
            ephemeral: true
        });
    }
};