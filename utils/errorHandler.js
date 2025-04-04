const { EmbedBuilder, Colors } = require("discord.js");

const ERROR_TYPES = {
    API: { color: Colors.Red, emoji: "⚠️" },
    PERMISSION: { color: Colors.Yellow, emoji: "🔒" },
    VALIDATION: { color: Colors.Blue, emoji: "📝" },
    DEFAULT: { color: Colors.DarkRed, emoji: "❌" }
};

async function handleError(interaction, error, type = "DEFAULT") {
    console.error(`[ERROR] ${type}:`, error);

    const errorType = ERROR_TYPES[type] || ERROR_TYPES.DEFAULT;
    
    const safeErrorMessage = (error.stack || error.message || "Erreur inconnue")
        .toString()
        .slice(0, 1000)
        .replace(/token=.+?(?=\s|$)/g, 'token=[REDACTED]')
        .replace(/api_key=.+?(?=\s|$)/g, 'api_key=[REDACTED]');

    const createErrorEmbed = (customTitle = null, customDescription = null) => {
        return new EmbedBuilder()
            .setTitle(`${errorType.emoji} ${customTitle || (type === "DEFAULT" ? "Erreur" : type)}`)
            .setColor(errorType.color)
            .setDescription(customDescription || `\`\`\`${safeErrorMessage}\`\`\``)
            .setFooter({ text: "Besoin d'aide ? @Khalifouille" });
    };

    if (error.code === 'MessageContentType') {
        const embed = createErrorEmbed(
            "❌ Format de message invalide",
            "Le contenu du message n'était pas au format texte valide.\n\n" +
            "**Solution:**\n" +
            "- Vérifiez que vous n'essayez pas d'envoyer un objet complexe\n" +
            "- Utilisez `.toString()` pour les valeurs non-textuelles"
        );

        return sendErrorResponse(interaction, embed);
    }

    return sendErrorResponse(interaction, createErrorEmbed());
}

async function sendErrorResponse(interaction, errorEmbed) {
    try {
        if (interaction.replied || interaction.deferred) {
            await interaction.editReply({ embeds: [errorEmbed] });
        } else {
            await interaction.reply({ 
                embeds: [errorEmbed], 
                ephemeral: true 
            });
        }
    } catch (sendError) {
        console.error("Échec de l'envoi du message d'erreur:", sendError);
        
        if (interaction.channel) {
            try {
                await interaction.channel.send({
                    embeds: [errorEmbed.setFooter({ text: "Erreur via fallback channel" })]
                });
            } catch (channelError) {
                console.error("Échec critique d'envoi d'erreur:", channelError);
            }
        }
    }
}

module.exports = { 
    handleError,
    ERROR_TYPES
};