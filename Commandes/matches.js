const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const fetch = (...args) => import("node-fetch").then(({ default: fetch }) => fetch(...args));
const { handleError } = require("../utils/errorHandler");
const { checkCooldown } = require("../utils/cooldownManager");
require("dotenv").config();

const apiKey = process.env.HENRIK_API_KEY;

module.exports = {
    name: "matches",
    description: "Récupère les derniers matchs d'un joueur Valorant",
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
        //console.log("Clé API :", apiKey);
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

            const url = `https://api.henrikdev.xyz/valorant/v3/matches/${region}/${gameName}/${tagLine}?force=true&api_key=${apiKey}`;
            //console.log("URL :", url);

            const response = await fetch(url);

            if (!response.ok) {
                throw new Error(`Erreur API : ${response.status} ${response.statusText}`);
            }

            const data = await response.json();

            if (!data.data || data.data.length === 0) {
                return interaction.editReply({
                    content: "❌ Aucun match trouvé pour ce joueur.",
                });
            }

            const embed = new EmbedBuilder()
                .setTitle(`🎮 Derniers matchs de ${gameName}#${tagLine}`)
                .setColor("#3498db")
                .setDescription("Voici les derniers matchs :")
                .addFields(
                    data.data.slice(0, 5).map((match) => ({
                        name: `🗺️ ${match.metadata.map} - ${match.metadata.mode}`,
                        value: `🔹 **Date** : ${match.metadata.game_start_patched}\n🔹 **ID du match** : ${match.metadata.matchid}\n🔹 **Rounds joués** : ${match.metadata.rounds_played}`,
                        inline: false,
                    }))
                )
                .setFooter({ text: `Demandé par ${interaction.user.username}`, iconURL: interaction.user.displayAvatarURL() })
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });
        } catch (error) {
            console.error("Erreur capturée :", error);
            await handleError(interaction, error);
        }
    },
};