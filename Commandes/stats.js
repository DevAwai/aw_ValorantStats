const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const fetch = (...args) => import("node-fetch").then(({ default: fetch }) => fetch(...args));
require("dotenv").config();
const path = require("path"); 
const fs = require("fs"); 
const cron = require("node-cron");
const apiKey = process.env.HENRIK_API_KEY;
const { checkCooldown } = require("../utils/cooldownManager");

const rankColors = {
    Iron: "#A6A6A6",
    Bronze: "#CD7F32",
    Silver: "#C0C0C0",
    Gold: "#FFD700",
    Platinum: "#00FFFF",
    Diamond: "#0A74DA",
    Ascendant: "#2ECC71",
    Immortal: "#E74C3C",
    Radiant: "#F1C40F",
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

async function checkForNewGames(client) {
    const trackedPlayers = loadTrackedPlayers();
    for (let i = 0; i < trackedPlayers.length; i++) {
        const player = trackedPlayers[i];
        try {
            const encodedName = encodeURIComponent(player.name);
            const encodedTag = encodeURIComponent(player.tag);

            const url = `https://api.henrikdev.xyz/valorant/v3/matches/eu/${encodedName}/${encodedTag}?force=true&api_key=${apiKey}`;
            const response = await fetch(url);

            if (!response.ok) {
                const errorData = await response.json();

                if (errorData.errors && errorData.errors[0]?.code === 22 && errorData.errors[0]?.message === "Account not found") {
                    console.log(`Le compte ${player.name}#${player.tag} est introuvable. Il a été retiré de la liste des suivis.`);
                    
                    trackedPlayers.splice(i, 1);
                    i--;
                    continue;
                }

                throw new Error(`Erreur API : ${response.status} ${response.statusText}`);
            }

            const data = await response.json();

            if (!data.data || data.data.length === 0) {
                continue;
            }

            const lastCompetitiveMatch = data.data.find(match => match.metadata.mode === "Competitive");
            if (!lastCompetitiveMatch) {
                continue;
            }

            const matchId = lastCompetitiveMatch.metadata.matchid;

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
                            { name: "🗺️ Carte", value: `${lastCompetitiveMatch.metadata.map}`, inline: true },
                            { name: "🔹 Rounds joués", value: `${lastCompetitiveMatch.metadata.rounds_played}`, inline: true },
                            { name: "🔗 Détails du match", value: `[Voir les détails](https://tracker.gg/valorant/match/${matchId})`, inline: false }
                        )
                        .setColor(isWin ? "Green" : "Red")
                        .setFooter({ text: "Mise à jour automatique" })
                        .setTimestamp();

                    await channel.send({ embeds: [embed] });

                    player.lastMatchId = matchId;
                    saveTrackedPlayers(trackedPlayers);
                }
            }
        } catch (error) {
            console.error(`Erreur lors de la vérification des matchs pour ${player.name}#${player.tag} :`, error);
        }
    }

}

module.exports = {
    name: "stats",
    description: "Affiche les statistiques d'un joueur Valorant",
    permissions: "Aucune",
    dm: false,
    cooldown: 2000,
    options: [
        {
            type: "string",
            name: "pseudo",
            description: "Le pseudo sous format Pseudo#Tag",
            required: true,
        },
    ],

    async execute(interaction) {
        const pseudo = interaction.options.getString("pseudo");
        const region = "eu";

        const cooldownResult = checkCooldown(interaction.user.id, this.name, this.cooldown);
        if (cooldownResult !== true) {
            return interaction.reply({ content: cooldownResult, ephemeral: true });
        }

        if (!pseudo.match(/^.+#[0-9A-Za-z]{3,5}$/)) {
            return interaction.reply({
                content: "❌ **Format invalide !** Utilise : `Pseudo#Tag` (ex: `Player#1234`)`",
                ephemeral: true,
            });
        }

        const [gameName, tagLine] = pseudo.split("#");

        try {
            await interaction.deferReply();

            const statsUrl = `https://api.henrikdev.xyz/valorant/v2/mmr/${region}/${gameName}/${tagLine}?api_key=${apiKey}`;
            const statsResponse = await fetch(statsUrl);
            if (!statsResponse.ok) {
                throw new Error(`Erreur API Stats : ${statsResponse.status} ${statsResponse.statusText}`);
            }

            const statsData = await statsResponse.json();

            if (!statsData.data) {
                return interaction.editReply({
                    content: "❌ Impossible de récupérer les statistiques pour ce joueur.",
                });
            }

            const accountUrl = `https://api.henrikdev.xyz/valorant/v1/account/${gameName}/${tagLine}?api_key=${apiKey}`;
            const accountResponse = await fetch(accountUrl);
            if (!accountResponse.ok) {
                throw new Error(`Erreur API Account : ${accountResponse.status} ${accountResponse.statusText}`);
            }

            const accountData = await accountResponse.json();

            if (!accountData.data) {
                return interaction.editReply({
                    content: "❌ Impossible de récupérer les informations du joueur.",
                });
            }

            const playerCardSmall = accountData.data.card.small; 
            const currentData = statsData.data.current_data;
            const highestRank = statsData.data.highest_rank;
            const elo = currentData.elo || "Inconnu";
            const currentRank = currentData.currenttierpatched || "Non classé";
            const rankingInTier = currentData.ranking_in_tier || "Inconnu";
            const mmrChange = currentData.mmr_change_to_last_game || 0;
            const rankBase = currentRank.split(" ")[0];
            const embedColor = rankColors[rankBase] || "#3498db"; 

            const embed = new EmbedBuilder()
                .setTitle(`🏆 Stats Ranked - ${gameName}#${tagLine}`)
                .setColor(embedColor)
                .setDescription("📊 Statistiques du mode Ranked")
                .setThumbnail(playerCardSmall)
                .addFields(
                    { name: "🔹 Rang Actuel", value: `${currentRank}`, inline: true },
                    { name: "🔝 Plus Haut Rang", value: `${highestRank.patched_tier || "Inconnu"}`, inline: true },
                    { name: "🔢 Elo", value: `${elo}`, inline: true },
                    { name: "📈 Rang dans le Tier", value: `${rankingInTier}`, inline: true },
                    { name: "🔄 Changement MMR", value: `${mmrChange > 0 ? `+${mmrChange}` : mmrChange}`, inline: true }
                )
                .setFooter({ text: "🔹Mode Ranked" })
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