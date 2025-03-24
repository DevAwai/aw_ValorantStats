const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { ExtendedAPI } = require("../utils/vandalExtended");
const { handleError } = require("../utils/errorHandler");

module.exports = {
    name: "matches",
    description: "Récupère les derniers matchs d'un joueur Valorant",
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
            name: "type",
            description: "Type de match (competitive, unrated, etc.)",
            required: false,
        },
        {
            type: "string",
            name: "season",
            description: "ID de la saison (optionnel)",
            required: false,
        },
    ],

    async execute(interaction) {
        const pseudo = interaction.options.getString("pseudo");
        const type = interaction.options.getString("type") || "competitive";
        const season = interaction.options.getString("season") || "";

        if (!pseudo.match(/^.+#[0-9A-Za-z]{3,5}$/)) {
            return interaction.reply({
                content: "❌ **Format invalide !** Utilise : `Pseudo#Tag` (ex: `Player#1234`)",
                ephemeral: true,
            });
        }

        const [gameName, tagLine] = pseudo.split("#");

        try {
            await interaction.deferReply();

            const api = new ExtendedAPI(gameName, tagLine);
            const matches = await api.matches({ type, season });

            if (matches.length === 0) {
                return interaction.editReply({
                    content: "❌ Aucun match trouvé pour ce joueur.",
                    ephemeral: true,
                });
            }

            const embed = new EmbedBuilder()
                .setTitle(`🎮 Derniers matchs de ${gameName}#${tagLine}`)
                .setColor("#3498db")
                .setDescription(`Voici les derniers matchs en mode **${type}** :`)
                .addFields(
                    matches.slice(0, 10).map((match) => ({
                        name: `🗺️ ${match.map.split("/").pop()} - ${new Date(match.timestamp).toLocaleString()}`,
                        value: `🔹 **Mode** : ${match.mode}\n🔹 **Durée** : ${Math.floor(match.duration / 60)} minutes\n🔹 **K/D** : ${match.stats.kDRatio?.value?.toFixed(2) || "N/A"}`,
                        inline: false,
                    }))
                )
                .setFooter({ text: `Demandé par ${interaction.user.username}`, iconURL: interaction.user.displayAvatarURL() })
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });
        } catch (error) {
            await handleError(interaction, error);
        }
    },
};