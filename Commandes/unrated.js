const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const fetch = (...args) => import("node-fetch").then(({ default: fetch }) => fetch(...args));
require("dotenv").config();

const apiKey = process.env.HENRIK_API_KEY;

module.exports = {
    name: "unrated",
    description: "Affiche le total des kills, morts, victoires et défaites pour toutes les parties Unrated d'un joueur",
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
    ],

    async execute(interaction) {
        const pseudo = interaction.options.getString("pseudo");
        const region = "eu";

        if (!pseudo.match(/^.+#[0-9A-Za-z]{3,5}$/)) {
            return interaction.reply({
                content: "❌ **Format invalide !** Utilise : `Pseudo#Tag` (ex: `Player#1234`)",
                ephemeral: true,
            });
        }

        const [gameName, tagLine] = pseudo.split("#");

        try {
            await interaction.deferReply();

            const matchesUrl = `https://api.henrikdev.xyz/valorant/v3/matches/${region}/${gameName}/${tagLine}?force=true&mode=unrated&api_key=${apiKey}`;
            const matchesResponse = await fetch(matchesUrl);
            if (!matchesResponse.ok) {
                throw new Error(`Erreur API Matches : ${matchesResponse.status} ${matchesResponse.statusText}`);
            }

            const matchesData = await matchesResponse.json();

            if (!matchesData.data || matchesData.data.length === 0) {
                return interaction.editReply({
                    content: "❌ Aucune partie Unrated trouvée pour ce joueur.",
                });
            }

            let totalKills = 0;
            let totalDeaths = 0;
            let totalWins = 0;
            let totalLosses = 0;

            matchesData.data.forEach(match => {
                const player = match.players.all_players.find(p => p.name === gameName && p.tag === tagLine);
                if (player) {
                    totalKills += player.stats.kills;
                    totalDeaths += player.stats.deaths;
            
                    if (match.teams.blue && match.teams.blue.team && match.teams.red && match.teams.red.team) {
                        if (player.team.toLowerCase() === match.teams.blue.team.toLowerCase()) {
                            if (match.teams.blue.has_won) {
                                totalWins++;
                            } else {
                                totalLosses++;
                            }
                        } else if (player.team.toLowerCase() === match.teams.red.team.toLowerCase()) {
                            if (match.teams.red.has_won) {
                                totalWins++;
                            } else {
                                totalLosses++;
                            }
                        }
                    }
                }
            });

            const embed = new EmbedBuilder()
                .setTitle(`🏆 Stats Unranked - ${gameName}#${tagLine}`)
                .setColor("#3498db")
                .setDescription("📊 Statistiques du mode Unranked")
                .addFields(
                    { name: "🔹 Total Kills", value: `${totalKills}`, inline: true },
                    { name: "🔹 Total Morts", value: `${totalDeaths}`, inline: true },
                    { name: "✅ Total Victoires", value: `${totalWins}`, inline: true },
                    { name: "❌ Total Défaites", value: `${totalLosses}`, inline: true }
                )
                .setFooter({ text: "🔹Mode Unranked" })
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