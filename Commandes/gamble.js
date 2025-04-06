const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { handleError } = require("../utils/errorHandler");
const { getUserBalance, updateUserBalance, createUserIfNotExists } = require("../utils/creditsManager");
const { checkCooldown } = require("../utils/cooldownManager");

module.exports = {
    name: "gamble",
    description: "Parie sur pile ou face avec un montant",
    cooldown: 10000,
    options: [
        {
            type: "string",
            name: "choix",
            description: "Choisissez entre 'pile' ou 'face'",
            required: true,
            choices: [
                { name: "Pile", value: "pile" },
                { name: "Face", value: "face" }
            ]
        },
        {
            type: "integer",
            name: "montant",
            description: "Le montant à parier",
            required: true,
            min_value: 1
        },
    ],
    async execute(interaction) {
        const cooldownResult = checkCooldown(interaction.user.id, this.name, this.cooldown);
        if (cooldownResult !== true) {
            return interaction.reply({ content: cooldownResult, ephemeral: true });
        }

        try {
            const choix = interaction.options.getString("choix");
            const montant = interaction.options.getInteger("montant");
            const userId = interaction.user.id;
            const userTag = interaction.user.username;

            createUserIfNotExists(userId);
            const userBalance = getUserBalance(userId);

            if (montant > userBalance) {
                return interaction.reply({
                    content: `❌ Solde insuffisant ! Vous avez seulement **${userBalance} VCOINS**.`,
                    ephemeral: true
                });
            }

            const resultat = Math.random() < 0.5 ? "pile" : "face";
            const aGagne = choix === resultat;
            const gain = aGagne ? montant : -montant;

            updateUserBalance(userId, gain);
            const newBalance = getUserBalance(userId);

            const embed = new EmbedBuilder()
                .setTitle(`🎲 Pile ou Face - Résultat: ${resultat.toUpperCase()}`)
                .setColor(aGagne ? "#00FF00" : "#FF0000")
                .setDescription(
                    aGagne
                        ? `🎉 **${userTag}** a gagné **${montant} VCOINS** !`
                        : `😢 **${userTag}** a perdu **${montant} VCOINS**.`
                )
                .addFields(
                    { name: "Mise", value: `${montant} VCOINS`, inline: true },
                    { name: "Choix", value: choix, inline: true },
                    { name: "Nouveau solde", value: `${newBalance} VCOINS`, inline: false }
                )
                .setThumbnail(interaction.user.displayAvatarURL())
                .setFooter({ text: "Jeu de Pile ou Face" });

            await interaction.reply({ 
                content: " ",
                embeds: [embed] 
            });

        } catch (error) {
            console.error("Erreur dans la commande gamble:", error);
            await interaction.reply({ 
                content: "❌ Une erreur est survenue lors de l'exécution de la commande.",
                ephemeral: true 
            });
        }
    },
};