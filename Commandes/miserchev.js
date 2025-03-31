const { SlashCommandBuilder } = require("discord.js");
const { placeBet } = require("../utils/raceManager");
const { isBettingOpen } = require("../utils/etatparis");
const { getUserBalance, updateUserBalance, createUserIfNotExists } = require("../utils/creditsManager");

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
        if (!isBettingOpen()) {
            return interaction.reply({
                content: "❌ Les paris ne sont pas ouverts actuellement. Attendez qu'une course soit annoncée.",
                ephemeral: true,
            });
        }

        const userId = interaction.user.id;
        const couleur = interaction.options.getString("couleur");
        const mise = interaction.options.getInteger("mise");

        createUserIfNotExists(userId);

        const userBalance = getUserBalance(userId);
        if (mise > userBalance) {
            return interaction.reply({
                content: `❌ Vous n'avez pas assez de VCOINS pour parier. Vous avez actuellement **${userBalance} VCOINS**.`,
                ephemeral: true,
            });
        }

        updateUserBalance(userId, -mise);

        const result = placeBet(userId, couleur, mise);
        await interaction.reply({ content: result, ephemeral: true });
    },
};