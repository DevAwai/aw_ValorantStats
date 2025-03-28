const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const fetch = (...args) => import("node-fetch").then(({ default: fetch }) => fetch(...args));
require("dotenv").config();
const path = require("path");
const fs = require("fs"); 
const apiKey = process.env.HENRIK_API_KEY;

const cooldowns = new Map();
const rankColors = {
    "iron": "#9F9F9F", "bronze": "#CD7F32", "silver": "#C0C0C0",
    "gold": "#FFD700", "platinum": "#00FFFF", "diamond": "#00BFFF",
    "ascendant": "#4B0082", "immortal": "#DC143C", "radiant": "#FFFF00"
};

const trackedPlayersPath = path.join(__dirname, "..", "suivi_joueurs.json");

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function loadTrackedPlayers() {
    if (!fs.existsSync(trackedPlayersPath)) {
        fs.writeFileSync(trackedPlayersPath, JSON.stringify([], null, 2));
    }
    return JSON.parse(fs.readFileSync(trackedPlayersPath, "utf-8"));
}

function saveTrackedPlayers(players) {
    fs.writeFileSync(trackedPlayersPath, JSON.stringify(players, null, 2));
}

async function fetchUserStats(gameName, tagLine) {
    const user = await API.fetchUser(gameName, tagLine);
    if (!user) throw new Error("Joueur introuvable");

    const allGamemodes = user.gamemodes();
    const userInfo = user.info();
    const rankedStats = user.ranked() || {};
    const unrankedStats = allGamemodes["unrated"] || allGamemodes["unranked"] || allGamemodes["normal"] || {};

    return {
        userInfo,
        rankedStats,
        unrankedStats,
        avatarURL: userInfo.avatar || "https://example.com/default-avatar.png",
        bannerURL: userInfo.card || "https://media.valorant-api.com/playercards/99fbf62b-4dbe-4edb-b4dc-89b4a56df7aa.png"
    };
}

async function checkForNewGames(client) {
    const trackedPlayers = loadTrackedPlayers();
    for (const player of trackedPlayers) {
        let retries = 3;
        while (retries > 0) {
            try {
                const url = `https://api.henrikdev.xyz/valorant/v3/matches/eu/${player.name}/${player.tag}?force=true&api_key=${process.env.HENRIK_API_KEY}`;
                console.log("URL :", url);

                const response = await fetch(url);
                if (!response.ok) {
                    throw new Error(`Erreur API : ${response.status} ${response.statusText}`);
                }

                const data = await response.json();

                if (!data.data || data.data.length === 0) {
                    console.log(`Aucun match trouvé pour ${player.name}#${player.tag}`);
                    break;
                }

                const lastCompetitiveMatch = data.data.find(match => match.metadata.mode === "Competitive");
                if (!lastCompetitiveMatch) {
                    console.log(`Aucun match compétitif trouvé pour ${player.name}#${player.tag}`);
                    break;
                }

                const matchId = lastCompetitiveMatch.metadata.matchid;
                const matchDetailsUrl = `https://tracker.gg/valorant/match/${matchId}`;
                const map = lastCompetitiveMatch.metadata.map;
                const roundsPlayed = lastCompetitiveMatch.metadata.rounds_played;

                if (matchId !== player.lastMatchId) {
                    const channel = client.channels.cache.get("1322904141164445727");
                    if (channel) {
                        const isWin = lastCompetitiveMatch.teams.red.has_won && lastCompetitiveMatch.players.all_players.some(p => p.name === player.name && p.team === "Red")
                            || lastCompetitiveMatch.teams.blue.has_won && lastCompetitiveMatch.players.all_players.some(p => p.name === player.name && p.team === "Blue");

                        const imageUrl = isWin
                            ? "https://i.postimg.cc/HkLmrjp5/win.png"
                            : "https://i.postimg.cc/9QNhZVMk/loose.png";

                        const embed = new EmbedBuilder()
                            .setTitle(isWin ? "✅ Valorant Stats - WIN" : "❌ Valorant Stats - LOOSE")
                            .setDescription(isWin
                                ? `**${player.name}#${player.tag}** vient de gagner un match compétitif 🥳`
                                : `**${player.name}#${player.tag}** vient de perdre un match compétitif 😢`)
                            .setImage(imageUrl)
                            .addFields(
                                //{ name: "🔹 Rang actuel", value: `${rank}`, inline: true },
                                { name: "🗺️ Carte", value: `${map}`, inline: true },
                                { name: "🔹 Rounds joués", value: `${roundsPlayed}`, inline: true },
                                { name: "🔗 Détails du match", value: `[Voir les détails](${matchDetailsUrl})`, inline: false }
                            )
                            .setColor(isWin ? "Green" : "Red")
                            .setFooter({ text: "Mise à jour automatique" })
                            .setTimestamp();

                        await channel.send({ embeds: [embed] });

                        player.lastMatchId = matchId;
                    }
                }
                break;
            } catch (error) {
                console.error(`❌ Erreur lors de la vérification des stats de ${player.name}#${player.tag} :`, error);
                retries -= 1;
                if (retries === 0) {
                    console.error(`❌ Échec de la vérification des stats de ${player.name}#${player.tag} après plusieurs tentatives.`);
                } else {
                    console.log(`🔄 Nouvelle tentative pour ${player.name}#${player.tag} (${3 - retries}/3)`);
                }
            }

            await sleep(1000);
        }

        await sleep(1000);
    }

    saveTrackedPlayers(trackedPlayers);
}

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
            required: true,
        },
        {
            type: "string",
            name: "region",
            description: "Région du joueur (eu, na, ap, etc.)",
            required: true,
        },
    ],

    async execute(interaction) {
        const pseudo = interaction.options.getString("pseudo");
        const region = interaction.options.getString("region");

        if (!pseudo.match(/^.+#[0-9A-Za-z]{3,5}$/)) {
            return interaction.reply({
                content: "❌ **Format invalide !** Utilise : `Pseudo#Tag` (ex: `Player#1234`)`",
                ephemeral: true,
            });
        }

        const [gameName, tagLine] = pseudo.split("#");

        try {
            await interaction.deferReply();

            const url = `https://api.henrikdev.xyz/valorant/v2/mmr/${region}/${gameName}/${tagLine}?api_key=${apiKey}`;
            console.log("URL :", url);

            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`Erreur API : ${response.status} ${response.statusText}`);
            }

            const data = await response.json();

            if (!data.data) {
                return interaction.editReply({
                    content: "❌ Impossible de récupérer les statistiques pour ce joueur.",
                });
            }

            const currentData = data.data.current_data;
            const highestRank = data.data.highest_rank;
            const elo = currentData.elo || "Inconnu";
            const currentRank = currentData.currenttier_patched || "Non classé";
            const rankingInTier = currentData.ranking_in_tier || "Inconnu";
            const mmrChange = currentData.mmr_change_to_last_game || 0;

            const embed = new EmbedBuilder()
                .setTitle(`📊 Statistiques de ${gameName}#${tagLine}`)
                .setColor("#3498db")
                .setDescription("Voici les statistiques actuelles du joueur :")
                .addFields(
                    { name: "🔹 Rang Actuel", value: `**${currentRank}**`, inline: true },
                    { name: "🔝 Plus Haut Rang", value: `**${highestRank.patched_tier || "Inconnu"}**`, inline: true },
                    { name: "🔢 Elo", value: `**${elo}**`, inline: true },
                    { name: "📈 Rang dans le Tier", value: `**${rankingInTier}**`, inline: true },
                    { name: "🔄 Changement MMR", value: `**${mmrChange > 0 ? `+${mmrChange}` : mmrChange}**`, inline: true }
                )
                .setFooter({ text: "Données fournies par l'API HenrikDev" })
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });
        } catch (error) {
            console.error("Erreur capturée :", error);
            await interaction.editReply({
                content: "❌ Une erreur est survenue lors de la récupération des statistiques.",
            });
        }
    },
};

cron.schedule('*/5 * * * *', () => {
    checkForNewGames(client);
});

module.exports.checkForNewGames = checkForNewGames;