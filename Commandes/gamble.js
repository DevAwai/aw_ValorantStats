const { SlashCommandBuilder } = require("discord.js");
const { handleError } = require("../utils/errorHandler");
const { getUserBalance, updateUserBalance, createUserIfNotExists } = require("../utils/creditsManager");
const cron = require("node-cron");
const { checkCooldown } = require("../utils/cooldownManager");
const { cooldown } = require("./credit");


module.exports = {
    name: "gamble",
    description: "Parie sur pile ou face avec un montant",
    cooldown: 2000,
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

        const cooldownResult = checkCooldown(interaction.user.id, this.name, this.cooldown);
        if (cooldownResult !== true) {
            return interaction.reply({ content: cooldownResult, ephemeral: true });
        }
        
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
                    content: `❌ Vous n'avez pas assez de VCOINS. Votre solde actuel est de ${userBalance} VCOINS.`,
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
                        ? `🎉 Félicitations, vous avez gagné **${gain} VCOINS** !`
                        : "😢 Vous avez perdu votre mise."
                } Votre nouveau solde est de **${newBalance} VCOINS**.`,
            });
        } catch (error) {
            await handleError(interaction, error);
        }
    },
};
