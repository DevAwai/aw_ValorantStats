const { EmbedBuilder } = require("discord.js");

async function handleError(interaction, error) {
    console.error("❌ Erreur API :", error);

    const errorEmbed = new EmbedBuilder()
        .setTitle("⚠️ Erreur API")
        .setColor("Red")
        .setDescription(`\`\`\`js\n${error.stack?.slice(0, 1000) || error.message}\n\`\`\``)
        .setFooter({ text: "Réessaie plus tard ou @Khalifouille / @Awai" });

    try {
        if (interaction.replied || interaction.deferred) {
            await interaction.editReply({ embeds: [errorEmbed] });
        } else {
            await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }
    } catch (err) {
        console.error("❌ Impossible de répondre à l'interaction :", err);
    }
}

module.exports = { handleError };