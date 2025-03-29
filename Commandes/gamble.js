const { SlashCommandBuilder } = require("discord.js");
const { handleError } = require("../utils/errorHandler");
const { getUserBalance, updateUserBalance, createUserIfNotExists } = require("../utils/creditsManager");

module.exports = {
    name: "gamble",
    description: "Parie sur pile ou face avec un montant",
    options: [
        {
            type: "string",
            name: "choix",
            description: "Choisissez entre 'pile' ou 'face'",
            required: true,
        },
        {
            type: "integer",
            name: "montant",
            description: "Le montant à parier",
            required: true,
        },
    ],
    async execute(interaction) {
        try {
            const choix = interaction.options.getString("choix").toLowerCase();
            const montant = interaction.options.getInteger("montant");

            if (!["pile", "face"].includes(choix)) {
                return interaction.reply({
                    content: "❌ Choix invalide ! Veuillez choisir entre 'pile' ou 'face'.",
                    ephemeral: true,
                });
            }

            if (montant <= 0) {
                return interaction.reply({
                    content: "❌ Le montant doit être supérieur à 0.",
                    ephemeral: true,
                });
            }

            const userId = interaction.user.id;
            createUserIfNotExists(userId);
            const userBalance = getUserBalance(userId);

            if (montant > userBalance) {
                return interaction.reply({
                    content: `❌ Vous n'avez pas assez de crédits. Votre solde actuel est de ${userBalance} crédits.`,
                    ephemeral: true,
                });
            }

            const resultat = Math.random() < 0.5 ? "pile" : "face";
            const gain = choix === resultat ? montant : -montant;

            updateUserBalance(userId, gain);

            const newBalance = getUserBalance(userId);

            await interaction.reply({
                content: `🎲 Le résultat est **${resultat}** ! ${
                    gain > 0
                        ? `🎉 Félicitations, vous avez gagné **${gain} crédits** !`
                        : "😢 Vous avez perdu votre mise."
                } Votre nouveau solde est de **${newBalance} crédits**.`,
            });
        } catch (error) {
            await handleError(interaction, error);
        }
    },
};