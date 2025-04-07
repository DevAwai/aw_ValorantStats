const { EmbedBuilder } = require('discord.js');
const { applyRandomTax } = require('../utils/taxesManager');

module.exports = {
    name: "forcertaxe",
    description: "🚨 Déclenche la taxation manuellement (Admin)",
    category: "Admin",
    ownerOnly: true,
    options: [],

    async execute(interaction) {
        const ADMIN_ID = "663844641250213919";
        if (interaction.user.id !== ADMIN_ID) {
            return interaction.reply({
                content: "❌ Action réservée au propriétaire du bot",
                flags: 64
            });
        }

        await interaction.deferReply({ ephemeral: true });

        try {
            const taxApplied = await applyRandomTax(interaction.client);
            
            if (!taxApplied) {
                return interaction.editReply({
                    content: "⚠️ Aucun utilisateur taxable ou erreur lors de l'application",
                    flags: 64
                });
            }

            const successEmbed = new EmbedBuilder()
                .setColor(0x00FF00)
                .setTitle("✅ Taxation forcée")
                .setDescription("Les taxes ont été appliquées avec succès !")
                .addFields(
                    { name: "Exécutée par", value: interaction.user.tag },
                    { name: "Heure", value: new Date().toLocaleString('fr-FR') }
                );

            await interaction.editReply({ embeds: [successEmbed] });

            const logChannel = interaction.client.channels.cache.get("1322904141164445727");
            if (logChannel) {
                const logEmbed = new EmbedBuilder()
                    .setColor(0xFFA500)
                    .setTitle("📊 TAXE MANUELLE")
                    .setDescription(`**Initiateur**: ${interaction.user.tag}\n**Action**: Taxation forcée`)
                    .setTimestamp();

                await logChannel.send({ embeds: [logEmbed] });
            }

        } catch (error) {
            console.error("[FORCER-TAXE] Erreur:", error);
            
            await interaction.editReply({
                content: `❌ Erreur critique: ${error.message}`,
                flags: 64
            });
        }
    }
};