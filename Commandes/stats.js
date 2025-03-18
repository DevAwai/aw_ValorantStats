const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { API } = require("vandal.js");

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
            const unrakedStats = user.unrated() || {}; 
            const generalStats = user.gamemodes();
//---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
            const avatarURL = userInfo.avatar;
            const bannerURL = userInfo.card || "https://media.valorant-api.com/playercards/99fbf62b-4dbe-4edb-b4dc-89b4a56df7aa.png"; 
            const rank = userInfo.rank || "Non classé";
            const peakRank = userInfo.peakRank || "Inconnu";
            const rankedKD = rankedStats.kDRatio || 0;
            const rankedKills = rankedStats.kills || 0;
            const rankedHeadshots = rankedStats.headshotsPercentage || 0;
            const totalKills = generalStats?.kills || "Inconnu";
            const rankedplayed = Number(rankedStats.matchesPlayed) || 0; 
            const unrankedplayed = Number(unrakedStats.matchesPlayed) || 0;
            const totalplayed = rankedplayed + unrankedplayed;

            const rankColors = {
                "Fer": "#9F9F9F",
                "Bronze": "#CD7F32",
                "Argent": "#C0C0C0",
                "Or": "#FFD700",
                "Platine": "#00FFFF",
                "Diamant": "#00BFFF",
                "Ascendant": "#4B0082",
                "Immortel": "#DC143C",
                "Radiant": "#FFFF00"
            };

            let embedColor = "Blue";
            Object.keys(rankColors).forEach((key) => {
                if (rank.includes(key)) embedColor = rankColors[key];
            });

            const embed = new EmbedBuilder()
                .setTitle(`📊 Valorant Stats - ${gameName}#${tagLine}`)
                .setColor(embedColor)
                .setThumbnail(avatarURL)
                .setImage(bannerURL)
                .addFields(
                    { name: "🏆 Rang Actuel", value: `**${rank}**`, inline: true },
                    { name: "🚀 Peak Rank", value: `**${peakRank}**`, inline: true },
                )
                .addFields(
                    { name: "🔫 K/D Ratio (Ranked)", value: `**${rankedKD.toFixed(2)}**`, inline: true },
                    { name: "💀 Kills (Ranked)", value: `**${rankedKills}**`, inline: true },
                    { name: "🎯 Headshot % (Ranked)", value: `**${rankedHeadshots.toFixed(2)}%**`, inline: true }
                )
                .addFields(
                    { name: "🎮 Parties Jouées (Total)", value: `**${totalplayed}**`, inline: true },
                    { name: "💀 Kills (Total)", value: `**${totalKills}**`, inline: true }
                )
                .setTimestamp();

            await interaction.editReply({
                content: "🎯 Voici les statistiques du joueur :",
                embeds: [embed]
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