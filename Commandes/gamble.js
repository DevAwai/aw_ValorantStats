const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { handleError } = require("../utils/errorHandler");
const { getUserBalance, updateUserBalance, createUserIfNotExists } = require("../utils/creditsManager");
const { checkCooldown, setCooldown } = require("../utils/cooldownManager");

module.exports = {
    name: "gamble",
    description: "Parie sur pile ou face (mise: 1-10 000 VCOINS)",
    cooldown: 10000,
    options: [
        {
            type: "string",
            name: "choix",
            description: "Choisissez entre 'pile' ou 'face'",
            required: true,
            choices: [
                { name: "Pile (1-10 000 VCOINS)", value: "pile" },
                { name: "Face (1-10 000 VCOINS)", value: "face" }
            ]
        },
        {
            type: "integer",
            name: "montant",
            description: "Mise (1-10 000 VCOINS)",
            required: true,
            min_value: 1,    
            max_value: 10000
        },
    ],
    async execute(interaction) {
        const cooldownResult = checkCooldown(interaction.user.id, this.name, this.cooldown);
        if (cooldownResult !== true) {
            return interaction.reply({ 
                content: `⏳ Attendez ${Math.ceil(cooldownResult.timeLeft/1000)}s avant de rejouer.`,
                ephemeral: true 
            });
        }

        try {
            const choix = interaction.options.getString("choix");
            const montant = interaction.options.getInteger("montant");
            const userId = interaction.user.id;

            if (montant < 1 || montant > 10000) {
                return interaction.reply({
                    content: "❌ Mise invalide (1-10 000 VCOINS seulement)",
                    ephemeral: true
                });
            }

            createUserIfNotExists(userId);
            const userBalance = getUserBalance(userId);

            if (montant > userBalance) {
                return interaction.reply({
                    content: `❌ Solde insuffisant ! Vous avez ${userBalance} VCOINS (mise min: 1, max: 10 000).`,
                    ephemeral: true
                });
            }

            setCooldown(userId, this.name, this.cooldown);

            const resultat = Math.random() < 0.5 ? "pile" : "face";
            const gain = choix === resultat ? montant : -montant;
            updateUserBalance(userId, gain);

            const embed = new EmbedBuilder()
                .setTitle(`🎲 ${choix.toUpperCase()} vs ${resultat.toUpperCase()}`)
                .setColor(choix === resultat ? "#00FF00" : "#FF0000")
                .addFields(
                    { name: "Mise", value: `${montant} VCOINS`, inline: true },
                    { name: "Résultat", value: choix === resultat ? "GAGNÉ" : "PERDU", inline: true },
                    { name: "Nouveau solde", value: `${getUserBalance(userId)} VCOINS`, inline: false },
                    { name: "Limites", value: "1-10 000 VCOINS", inline: false }
                )
                .setFooter({ text: `Prochain jeu dans ${this.cooldown/1000}s` });

            await interaction.reply({ 
                embeds: [embed],
                ephemeral: true 
            });

        } catch (error) {
            console.error("Erreur:", error);
            await interaction.reply({ 
                content: "❌ Échec de la partie",
                ephemeral: true 
            });
        }
    }
};