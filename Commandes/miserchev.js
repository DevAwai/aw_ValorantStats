const { SlashCommandBuilder } = require("discord.js");
const { placeBet } = require("../utils/raceManager");
const { bettingOpen } = require("./course");

module.exports = {
    name: "miserchev",
    description: "Pariez sur un cheval pour la course en cours",
    cooldown: 2000,
    options: [
        {
            type: "string",
            name: "couleur",
            description: "Choisissez une couleur : rouge, bleu, vert, jaune",
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
        if (!bettingOpen) {
            return interaction.reply({
                content: "❌ Les paris ne sont pas ouverts actuellement. Attendez qu'une course soit annoncée.",
                ephemeral: true,
            });
        }

        const couleur = interaction.options.getString("couleur");
        const mise = interaction.options.getInteger("mise");

        const result = placeBet(interaction.user.id, couleur, mise);
        await interaction.reply({ content: result, ephemeral: true });
    },
};