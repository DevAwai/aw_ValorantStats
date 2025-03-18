const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
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

        if (!pseudo.match(/^.+#[0-9A-Za-z]{3,5}$/)) {
            return interaction.reply({
                content: "❌ Format invalide ! Utilise : `Pseudo#Tag` (exemple : `Player#1234`)",
                ephemeral: true
            });
        }

        const [gameName, tagLine] = pseudo.split("#");

        try {
            await interaction.deferReply();

            const user = await API.fetchUser(gameName, tagLine);

            if (!user) {
                return interaction.editReply({
                    content: "❌ Joueur non trouvé. Vérifie le pseudo et le tag.",
                    ephemeral: true
                });
            }

            const userInfo = user.info();
            const rankedStats = user.ranked();
            const rank = userInfo.rank || "Inconnu";
            const peakRank = userInfo.peakRank || "Inconnu";
            const avatarURL = userInfo.avatar;
            const rankedMatchesPlayed = rankedStats.matchesPlayed || 0;
            const rankedWinRate = rankedStats.matchesWinPct || 0;

            const embed = new EmbedBuilder()
                .setTitle(`📊 Stats de ${gameName}#${tagLine}`)
                .setColor("Blue")
                .setThumbnail(avatarURL) 
                .addFields(
                    { name: "🏆 Rang actuel", value: rank, inline: true },
                    { name: "🚀 Peak Rank", value: peakRank, inline: true },
                    { name: "📈 Taux de victoire", value: rankedWinRate, inline: true },
                    { name: "🎮 Parties jouées", value: rankedMatchesPlayed.toString(), inline: true }
                )
                .setFooter({ text: "Statistiques fournies par Vandal.js" })
                .setTimestamp();

            await interaction.editReply({
                content: "Voici les statistiques du joueur :",
                embeds: [embed],
                ephemeral: false
            });

        } catch (error) {
            console.error("Erreur lors de la récupération des données :", error);
            await interaction.editReply({
                content: "❌ Une erreur est survenue lors de la récupération des données. Réessaie plus tard.",
                ephemeral: true
            });
        }
    }
};