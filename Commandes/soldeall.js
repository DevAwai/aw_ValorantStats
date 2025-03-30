const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { loadCredits } = require("../utils/creditsManager");

module.exports = {
    name: "soldeall",
    description: "Affiche le solde de tous les joueurs",
    options: [],
    async execute(interaction) {
        try {
            const credits = loadCredits();

            if (Object.keys(credits).length === 0) {
                return interaction.reply({
                    content: "❌ Aucun joueur n'a encore de solde enregistré.",
                    ephemeral: true,
                });
            }

            const embed = new EmbedBuilder()
                .setColor("#00FF00")
                .setTitle("💰 Solde de tous les joueurs")
                .setDescription("Voici la liste des joueurs et leurs VCOINS :")
                .setFooter({ text: "Casino Valorant Stats", iconURL: interaction.client.user.displayAvatarURL() })
                .setTimestamp();

            for (const userId in credits) {
                embed.addFields({
                    name: `<@${userId}>`,
                    value: `**${credits[userId]} VCOINS**`,
                    inline: true,
                });
            }

            await interaction.reply({ embeds: [embed], ephemeral: false });
        } catch (error) {
            console.error("Erreur lors de l'exécution de la commande /soldeall :", error);
            await interaction.reply({
                content: "❌ Une erreur est survenue lors de l'exécution de la commande.",
                ephemeral: true,
            });
        }
    },
};