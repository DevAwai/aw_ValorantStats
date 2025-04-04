const { EmbedBuilder } = require("discord.js");
const { Colors } = require('discord.js');

const ERROR_TYPES = {
    API: { color: Colors.Red, emoji: "⚠️" },
    PERMISSION: { color: Colors.Yellow, emoji: "🔒" },
    VALIDATION: { color: Colors.Blue, emoji: "📝" },
    DEFAULT: { color: Colors.DarkRed, emoji: "❌" }
};

async function handleError(interaction, error, type = "DEFAULT") {
    console.error(`[ERROR] ${type}:`, error);

    const errorType = ERROR_TYPES[type] || ERROR_TYPES.DEFAULT;
    
    if (error.code === 'MessageContentType') {
        const correctedEmbed = new EmbedBuilder()
            .setColor(Colors.Red)
            .setTitle("❌ Erreur de format")
            .setDescription("Le contenu du message n'était pas au bon format.")
            .setFooter({ text: "Cette erreur a été automatiquement corrigée" });

        try {
            return await interaction.reply({ 
                embeds: [correctedEmbed],
                ephemeral: true 
            });
        } catch (fallbackError) {
            console.error("Fallback error handling:", fallbackError);
            return;
        }
    }

    const errorMessage = (error.stack || error.message || "Erreur inconnue")
        .toString()
        .slice(0, 1000)
        .replace(/token=.+?(?=\s|$)/g, 'token=[REDACTED]');

    const errorEmbed = new EmbedBuilder()
        .setTitle(`${errorType.emoji} ${type === "DEFAULT" ? "Erreur" : type}`)
        .setColor(errorType.color)
        .setDescription(`\`\`\`${errorMessage}\`\`\``)
        .setFooter({ text: "Besoin d'aide ? @Khalifouille" });

    try {
        if (interaction.replied || interaction.deferred) {
            await interaction.editReply({ embeds: [errorEmbed] });
        } else {
            await interaction.reply({ 
                embeds: [errorEmbed], 
                ephemeral: true 
            });
        }
    } catch (err) {
        console.error("Échec de l'envoi du message d'erreur :", err);
        if (interaction.channel) {
            await interaction.channel.send({ 
                content: `${errorType.emoji} Une erreur est survenue!`,
                embeds: [errorEmbed] 
            });
        }
    }
}

module.exports = { 
    handleError,
    ERROR_TYPES
};