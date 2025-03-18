const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const axios = require("axios");

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
        const RIOT_API_KEY = "RGAPI-f3507647-901a-4130-92e1-0c6754b946e9";
        const pseudo = interaction.options.getString("pseudo");

        // Vérification du format
        if (!pseudo.includes("#")) {
            return interaction.reply({
                content: "❌ Format invalide ! Utilise : `Pseudo#Tag`",
                ephemeral: false
            });
        }

        const [gameName, tagLine] = pseudo.split("#");

        try {
            await interaction.deferReply();

            // 🔹 Récupération du PUUID du joueur
            const accountUrl = `https://europe.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${gameName}/${tagLine}?api_key=${RIOT_API_KEY}`;
            const accountRes = await axios.get(accountUrl);

            if (accountRes.status !== 200) {
                return interaction.editReply({
                    content: "❌ Joueur non trouvé ou API indisponible.",
                    ephemeral: false
                });
            }

            const puuid = accountRes.data.puuid;

           
            const actUrl = `https://eu.api.riotgames.com/val/ranked/v1/acts?api_key=${RIOT_API_KEY}`;
            const actRes = await axios.get(actUrl);

            if (actRes.status !== 200 || actRes.data.length === 0) {
                return interaction.editReply({
                    content: "❌ Impossible de récupérer les informations des actes.",
                    ephemeral: false
                });
            }

            
            const actId = actRes.data[0].id;

            
            const statsUrl = `https://api.riotgames.com/val/ranked/v1/leaderboards/by-act/${actId}?puuid=${puuid}&api_key=${RIOT_API_KEY}`;
            const statsRes = await axios.get(statsUrl);

            if (statsRes.status !== 200) {
                return interaction.editReply({
                    content: "❌ Impossible de récupérer les stats du joueur.",
                    ephemeral: false 
                });
            }

            const stats = statsRes.data;
            const rank = stats.rank || "Inconnu";
            const wins = stats.wins || "N/A";
            const kd = stats.kdRatio || "N/A";

          
            const embed = new EmbedBuilder()
                .setTitle(`📊 Stats de ${gameName}#${tagLine}`)
                .setColor("Blue")
                .addFields(
                    { name: "🏆 Rang", value: rank, inline: true },
                    { name: "✅ Victoires", value: `${wins}`, inline: true },
                    { name: "🔫 K/D", value: `${kd}`, inline: true }
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
