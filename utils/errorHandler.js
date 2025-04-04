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
    const errorMessage = error.stack?.slice(0, 1000) || error.message || "Erreur inconnue";

    const errorEmbed = new EmbedBuilder()
        .setTitle(`${errorType.emoji} ${type === "DEFAULT" ? "Erreur" : type}`)
        .setColor(errorType.color)
        .setDescription(`\`\`\`js\n${errorMessage}\n\`\`\``)
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