const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, Client, Intents } = require("discord.js");
const { API } = require("vandal.js");
const fs = require("fs");
const path = require("path");

const cooldowns = new Map();
const rankColors = {
    "iron": "#9F9F9F", "bronze": "#CD7F32", "silver": "#C0C0C0",
    "gold": "#FFD700", "platinum": "#00FFFF", "diamond": "#00BFFF",
    "ascendant": "#4B0082", "immortal": "#DC143C", "radiant": "#FFFF00"
};

const trackedPlayersPath = path.join(__dirname, "..", "suivi_joueurs.json");

function loadTrackedPlayers() {
    if (!fs.existsSync(trackedPlayersPath)) {
        fs.writeFileSync(trackedPlayersPath, JSON.stringify([], null, 2));
    }
    return JSON.parse(fs.readFileSync(trackedPlayersPath, "utf-8"));
}

function saveTrackedPlayers(players) {
    fs.writeFileSync(trackedPlayersPath, JSON.stringify(players, null, 2));
}

// CHECK DES GAMES TOUTES LES X TEMPS
async function checkForNewGames(client) {
    const trackedPlayers = loadTrackedPlayers();
    for (const player of trackedPlayers) {
        try {
            const user = await API.fetchUser(player.name, player.tag);
            const rankedStats = user.ranked() || {};
            const currentMatchesPlayed = rankedStats.matchesPlayed || 0;

            if (currentMatchesPlayed > player.lastMatchesPlayed) {
                const channel = client.channels.cache.get("1322904141164445727");
                if (channel) {
                    const embed = new EmbedBuilder()
                        .setTitle("🎮 Nouvelle partie détectée !")
                        .setDescription(`**${player.name}#${player.tag}** a terminé une nouvelle partie en mode Ranked.`)
                        .addFields(
                            { name: "🔹 Parties jouées", value: `**${currentMatchesPlayed}**`, inline: true },
                            { name: "🔹 Rang actuel", value: `**${user.info().rank || "Non classé"}**`, inline: true }
                        )
                        .setColor("Green")
                        .setTimestamp();

                    await channel.send({ embeds: [embed] });
                }

                player.lastMatchesPlayed = currentMatchesPlayed;
            }
        } catch (error) {
            console.error(`❌ Erreur lors de la vérification des stats de ${player.name}#${player.tag} :`, error);
        }
    }

    saveTrackedPlayers(trackedPlayers);
}

//----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

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

        if (cooldowns.has(userId) && cooldowns.get(userId) > Date.now()) {
            return interaction.reply({
                content: `⏳ **Attends un peu !** (${(cooldowns.get(userId) - Date.now()) / 1000}s restantes)`,
                ephemeral: true
            });
        }
        cooldowns.set(userId, Date.now() + cooldownTime);
        setTimeout(() => cooldowns.delete(userId), cooldownTime);

        const pseudo = interaction.options.getString("pseudo");

        if (!pseudo.match(/^.+#[0-9A-Za-z]{3,5}$/)) {
            return interaction.reply({
                content: "❌ **Format invalide !** Utilise : `Pseudo#Tag` (ex: `Player#1234`)`",
                ephemeral: true
            });
        }

        const [gameName, tagLine] = pseudo.split("#");

        try {
            await interaction.deferReply();

            const user = await API.fetchUser(gameName, tagLine);
            if (!user) {
                return interaction.editReply({
                    content: "❌ **Joueur introuvable !** Vérifie le pseudo et le tag."
                });
            }

            const allGamemodes = user.gamemodes();
            const userInfo = user.info();
            const rankedStats = user.ranked() || {};
            const unrankedStats = allGamemodes["unrated"] || allGamemodes["unranked"] || allGamemodes["normal"] || {};

            const avatarURL = userInfo.avatar || "https://example.com/default-avatar.png";
            const bannerURL = userInfo.card || "https://media.valorant-api.com/playercards/99fbf62b-4dbe-4edb-b4dc-89b4a56df7aa.png";
            const rank = userInfo.rank || "Non classé";
            const peakRank = userInfo.peakRank || "Inconnu";

            const cleanRank = rank.toLowerCase().replace(/[^a-z]/g, "");
            let embedColor = rankColors[cleanRank] || "Blue";

            const embedRanked = new EmbedBuilder()
                .setTitle(`🏆 Stats Ranked - ${gameName}#${tagLine}`)
                .setColor(embedColor)
                .setThumbnail(avatarURL)
                .setImage(bannerURL)
                .setDescription("📊 **Statistiques du mode Ranked**")
                .addFields(
                    { name: "🔹 Rang Actuel", value: `**${rank}**`, inline: true },
                    { name: "🔝 Peak Rank", value: `**${peakRank}**`, inline: true },
                    { name: "🔫 K/D Ratio", value: `**${rankedStats.kDRatio?.toFixed(2) || "0.00"}**`, inline: true },
                    { name: "🎯 Headshot %", value: `**${rankedStats.headshotsPercentage?.toFixed(2) || "0"}%**`, inline: true },
                    { name: "🎮 Parties Jouées", value: `**${rankedStats.matchesPlayed || 0}**`, inline: true },
                    { name: "💀 Kills", value: `**${rankedStats.kills || 0}**`, inline: true }
                )
                .setFooter({ text: "🔹 Mode Ranked", iconURL: avatarURL })
                .setTimestamp();

            const embedUnranked = new EmbedBuilder()
                .setTitle(`🎮 Stats Unranked - ${gameName}#${tagLine}`)
                .setColor("Grey")
                .setThumbnail(avatarURL)
                .setImage(bannerURL)
                .setDescription("📊 **Statistiques du mode Unranked**")
                .addFields(
                    { name: "🔫 K/D Ratio", value: `**${unrankedStats.kDRatio?.toFixed(2) || "0.00"}**`, inline: true },
                    { name: "🎯 Headshot %", value: `**${unrankedStats.headshotsPercentage?.toFixed(2) || "0"}%**`, inline: true },
                    { name: "🎮 Parties Jouées", value: `**${unrankedStats.matchesPlayed || 0}**`, inline: true },
                    { name: "💀 Kills", value: `**${unrankedStats.kills || 0}**`, inline: true }
                )
                .setFooter({ text: "🎮 Mode Unranked", iconURL: avatarURL })
                .setTimestamp();

            const buttons = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId("ranked_stats")
                    .setLabel("🏆 Mode Ranked")
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId("unranked_stats")
                    .setLabel("🎮 Mode Unranked")
                    .setStyle(ButtonStyle.Primary)
            );

            await interaction.editReply({
                content: `🎯 **Sélectionne le mode de jeu pour voir les stats de** \`${gameName}#${tagLine}\` :`,
                components: [buttons]
            });

            const filter = i => i.user.id === interaction.user.id;
            const collector = interaction.channel.createMessageComponentCollector({ filter, time: 15000 });

            collector.on("collect", async i => {
                if (i.customId === "ranked_stats") {
                    await i.update({ embeds: [embedRanked], components: [] });
                } else if (i.customId === "unranked_stats") {
                    await i.update({ embeds: [embedUnranked], components: [] });
                }
                collector.stop();
            });

            collector.on("end", collected => {
                if (collected.size === 0) {
                    interaction.editReply({ content: "⏳ **Temps écoulé !**", components: [] });
                }
            });

        } catch (error) {
            console.error("❌ Erreur API :", error);

            const errorEmbed = new EmbedBuilder()
                .setTitle("⚠️ Erreur API")
                .setColor("Red")
                .setDescription(`\`\`\`js\n${error.stack?.slice(0, 1000) || error.message}\n\`\`\``)
                .setFooter({ text: "Réessaie plus tard ou contacte le support." });

            await interaction.editReply({ embeds: [errorEmbed] });
        }
    }
};

module.exports.checkForNewGames = checkForNewGames;