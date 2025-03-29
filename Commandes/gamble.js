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

            // Vérifier que l'utilisateur a assez de crédits
            const userId = interaction.user.id;
            const userBalance = await getUserBalance(userId); // À implémenter

            if (montant > userBalance) {
                return interaction.reply({
                    content: `❌ Vous n'avez pas assez de crédits. Votre solde actuel est de ${userBalance} crédits.`,
                    ephemeral: true,
                });
            }

            // Générer un résultat aléatoire
            const resultat = Math.random() < 0.5 ? "pile" : "face";
            const gain = choix === resultat ? montant * 2 : 0;

            // Mettre à jour le solde de l'utilisateur
            await updateUserBalance(userId, gain - montant); // À implémenter

            await interaction.reply({
                content: `🎲 Le résultat est **${resultat}** ! Vous avez ${gain > 0 ? `gagné ${gain} crédits !` : "perdu votre mise."}`,
            });
        } catch (error) {
            await handleError(interaction, error);
        }
    },
};
