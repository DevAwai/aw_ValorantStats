const { SlashCommandBuilder } = require("discord.js");
const { placeBet } = require("../utils/raceManager");

module.exports = {
    name: "miserchev",
    description: "GAYGAY",
    cooldown: 2000,
    options: [
        {
            type: "string",
            name: "couleur",
            description: "Choisissez entre 'pile' ou 'face'",
            required: true,
        },
        {
            type: "integer",
            name: "mise",
            description: "Le montant à parier",
            required: true,
        },
    ],
    async execute(interaction) {
        const couleur = interaction.options.getString("couleur");
        const mise = interaction.options.getInteger("mise");

        const result = placeBet(interaction.user.id, couleur, mise);
        await interaction.reply({ content: result, ephemeral: true });
    },
};