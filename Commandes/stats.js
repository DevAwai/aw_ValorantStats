const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const axios = require("axios");
const { API } = require('vandal.js');

module.exports = {
    name: "stats",
    description: "Affiche les statistiques d'un joueur Valorant",
    permissions: "Aucune",
    dm: false,
    options: [
        {
            type: "string",
            name: "pseudo",
            description: "Le pseudo sous format Pseudo#Tag",
            required: true
        }
    ],

    async execute(interaction) {
        const pseudo = interaction.options.getString("pseudo");

        if (!pseudo.includes("#")) {
            return interaction.reply({
                content: "❌ Format invalide ! Utilise : `Pseudo#Tag`",
                ephemeral: false
            });
        }

        const [gameName, tagLine] = pseudo.split("#");

        try {
            await interaction.deferReply();

            const user = await API.fetchUser(gameName, tagLine);

            if (!user) {
                return interaction.editReply({
                    content: "❌ Joueur non trouvé ou API indisponible.",
                    ephemeral: false
                });
            }

            const userInfo = user.info();
            const rank = userInfo.rank || "Inconnu";
            const peakRank = userInfo.peakRank || "Inconnu";
            const pageViews = userInfo.pageViews || "N/A";

            const embed = new EmbedBuilder()
                .setTitle(`📊 Stats de ${gameName}#${tagLine}`)
                .setColor("Blue")
                .addFields(
                    { name: "🏆 Rang actuel", value: rank, inline: true },
                    { name: "🚀 Peak Rank", value: peakRank, inline: false },
                )
                .setTimestamp();

            await interaction.editReply({
                content: "Voici les statistiques du joueur :",
                embeds: [embed],
                ephemeral: false
            });

        } catch (error) {
            console.error(error);
            return interaction.editReply({
                content: "❌ Erreur lors de la récupération des données.",
                ephemeral: false
            });
        }
    }
};