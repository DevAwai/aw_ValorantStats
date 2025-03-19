const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { API } = require("vandal.js");
const cooldowns = new Map();

const rankColors = {
    "iron": "#9F9F9F",       // Fer
    "bronze": "#CD7F32",     // Bronze
    "silver": "#C0C0C0",     // Argent
    "gold": "#FFD700",       // Or
    "platinum": "#00FFFF",   // Platine
    "diamond": "#00BFFF",    // Diamant
    "ascendant": "#4B0082",  // Ascendant
    "immortal": "#DC143C",   // Immortel
    "radiant": "#FFFF00"     // Radiant
};

module.exports = {
    name: "stats",
    description: "Affiche les statistiques d'un joueur Valorant",
    permissions: "Aucune",
    dm: false,
    cooldown: 10,
    options: [
        {
            type: "string",
            name: "pseudo",
            description: "Le pseudo sous format Pseudo#Tag",
            required: true
        }
    ],

    async execute(interaction) {
        const userId = interaction.user.id;
        const cooldownTime = this.cooldown * 1000; 

        if (cooldowns.has(userId)) {
            const remainingTime = cooldowns.get(userId) - Date.now();
            if (remainingTime > 0) {
                return interaction.reply({
                    content: `⏳ **Fils De Pute !** Attends ${(remainingTime / 1000).toFixed(1)} seconde(s) avant de refaire !`,
                    ephemeral: true
                });
            }
        }

        cooldowns.set(userId, Date.now() + cooldownTime);

        setTimeout(() => cooldowns.delete(userId), cooldownTime);

        const pseudo = interaction.options.getString("pseudo");

        if (!pseudo.match(/^.+#[0-9A-Za-z]{3,5}$/)) {
            return interaction.reply({
                content: "❌ **Format invalide !**\nUtilise : `Pseudo#Tag` (exemple : `Player#1234`)",
                ephemeral: true
            });
        }

        if (pseudo.toLowerCase() === "moraisn#3025") {
            const trollEmbed = new EmbedBuilder()
                .setTitle("🚫 Pas besoin de vérifier !")
                .setColor("Red")
                .setDescription("Tout le monde sait que **Moraisn#3025** est nul... 😂")
                .setImage("https://media.tenor.com/UllMEu4hWl4AAAAM/clown.gif")
                .setFooter({ text: "Allez, retourne t'entraîner fdp." });

            return interaction.reply({
                embeds: [trollEmbed],
                ephemeral: false
            });
        }

        const [gameName, tagLine] = pseudo.split("#");

        try {
            await interaction.deferReply();

            const user = await API.fetchUser(gameName, tagLine);
            console.log("API Response (Raw):", user?._raw || "No raw data");

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

                console.log("Unranked Stats:", user.gamemodes());

                const avatarURL = userInfo.avatar || "https://example.com/default-avatar.png";
                const bannerURL = userInfo.card || "https://media.valorant-api.com/playercards/99fbf62b-4dbe-4edb-b4dc-89b4a56df7aa.png";
                const rank = userInfo.rank || "Non classé";
                const peakRank = userInfo.peakRank || "Inconnu";
                const rankedKD = rankedStats.kDRatio ? rankedStats.kDRatio.toFixed(2) : "0.00";
                const rankedKills = rankedStats.kills || 0;
                const rankedHeadshots = rankedStats.headshotsPercentage ? `${rankedStats.headshotsPercentage.toFixed(2)}%` : "0%";
                const rankedPlayed = rankedStats.matchesPlayed ? Number(rankedStats.matchesPlayed) : 0;
                const unrankedPlayed = unrankedStats.matchesPlayed ? Number(unrankedStats.matchesPlayed) : 0;
                const totalPlayed = rankedPlayed + unrankedPlayed || "Inconnu";

                const cleanRank = rank.toLowerCase().replace(/[^a-z]/g, ""); 

                let embedColor = "Blue"; 
                for (const key in rankColors) {
                    if (cleanRank.includes(key)) {
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
                        { name: "🎯 Headshot % (Ranked)", value: `**${rankedHeadshots}**`, inline: true }
                    )
                    .addFields(
                        { name: "🎮 Parties Jouées (Total)", value: `**${totalPlayed}**`, inline: true },
                        { name: "💀 Kills", value: `**${rankedKills}**`, inline: true }
                    )
                    .setTimestamp();

                await interaction.editReply({
                    content: "🎯 Voici les statistiques du joueur :",
                    embeds: [embed]
                });
            } catch (dataError) {
                console.error("❌ Erreur lors du traitement des données :", dataError);

                const errorEmbed = new EmbedBuilder()
                    .setTitle("⚠️ Erreur lors du traitement des données")
                    .setColor("Red")
                    .setDescription(
                        `\`\`\`js\n${dataError.stack?.slice(0, 1000) || dataError.message}\n\`\`\``
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
                    `\`\`\`js\n${apiError.stack?.slice(0, 1000) || apiError.message}\n\`\`\``
                )
                .setFooter({ text: "Réessaie plus tard ou contacte le support." });

            await interaction.editReply({ embeds: [errorEmbed], ephemeral: true });
        }
    }
};