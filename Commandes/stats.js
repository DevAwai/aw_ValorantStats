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
                content: "❌ **Format invalide !**\nUtilise : `Pseudo#Tag` (exemple : `Player#1234`)",
                ephemeral: true
            });
        }

        const [gameName, tagLine] = pseudo.split("#");

        try {
            await interaction.deferReply();

            const user = await API.fetchUser(gameName, tagLine);

            if (!user) {
                return interaction.editReply({
                    content: "❌ **Joueur introuvable !**\nVérifie que le pseudo et le tag sont corrects.",
                    ephemeral: true
                });
            }

            try {
                const userInfo = user.info();
                const rankedStats = user.ranked() || {};
                const unrankedStats = user.unrated() || {};
                const generalStats = user.gamemodes() || {};

                const avatarURL = userInfo.avatar || "https://example.com/default-avatar.png";
                const bannerURL = userInfo.card || "https://media.valorant-api.com/playercards/99fbf62b-4dbe-4edb-b4dc-89b4a56df7aa.png"; 
                const rank = userInfo.rank || "Non classé";
                const peakRank = userInfo.peakRank || "Inconnu";
                const rankedKD = rankedStats.kDRatio ? rankedStats.kDRatio.toFixed(2) : "0.00";
                const rankedKills = rankedStats.kills || 0;
                const rankedHeadshots = rankedStats.headshotsPercentage ? `${rankedStats.headshotsPercentage.toFixed(2)}%` : "0%";
                const totalKills = generalStats.kills || "Inconnu";
                const rankedPlayed = rankedStats.matchesPlayed ? Number(rankedStats.matchesPlayed) : 0;
                const unrankedPlayed = unrankedStats.matchesPlayed ? Number(unrankedStats.matchesPlayed) : 0;
                const totalPlayed = rankedPlayed + unrankedPlayed;

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
                for (const key in rankColors) {
                    if (rank.includes(key)) {
                        embedColor = rankColors[key];
                        break;
                    }
                }

                const embed = new EmbedBuilder()
                    .setTitle(`📊 Valorant Stats - ${gameName}#${tagLine}`)
                    .setColor(embedColor)
                    .setThumbnail(avatarURL)
                    .setImage(bannerURL)
                    .addFields(
                        { name: "🏆 Rang Actuel", value: `**${rank}**`, inline: true },
                        { name: "🚀 Peak Rank", value: `**${peakRank}**`, inline: true }
                    )
                    .addFields(
                        { name: "🔫 K/D Ratio (Ranked)", value: `**${rankedKD}**`, inline: true },
                        { name: "💀 Kills (Ranked)", value: `**${rankedKills}**`, inline: true },
                        { name: "🎯 Headshot % (Ranked)", value: `**${rankedHeadshots}**`, inline: true }
                    )
                    .addFields(
                        { name: "🎮 Parties Jouées (Total)", value: `**${totalPlayed}**`, inline: true },
                        { name: "💀 Kills (Total)", value: `**${totalKills}**`, inline: true }
                    )
                    .setTimestamp();

                await interaction.editReply({
                    content: "🎯 Voici les statistiques du joueur :",
                    embeds: [embed]
                });
                // Gestion des erreurs
            } catch (dataError) {
                console.error("❌ Erreur lors du traitement des données :", dataError);

                const errorEmbed = new EmbedBuilder()
                    .setTitle("⚠️ Erreur lors du traitement des données")
                    .setColor("Red")
                    .setDescription(
                        `\`\`\`js\n${dataError.stack.slice(0, 1000)}\n\`\`\``
                    )
                    .setFooter({ text: "Si le problème persiste, contacte un administrateur." });

                await interaction.editReply({ embeds: [errorEmbed], ephemeral: true });
            }

        } catch (apiError) {
            console.error("❌ Erreur API :", apiError);

            const errorEmbed = new EmbedBuilder()
                .setTitle("⚠️ Erreur lors de la connexion à l'API")
                .setColor("Red")
                .setDescription(
                    `\`\`\`js\n${apiError.stack.slice(0, 1000)}\n\`\`\``
                )
                .setFooter({ text: "Réessaie plus tard ou contacte le support." });

            await interaction.editReply({ embeds: [errorEmbed], ephemeral: true });
        }
    }
};
