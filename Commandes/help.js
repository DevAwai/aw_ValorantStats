const { EmbedBuilder } = require("discord.js");
const fs = require("fs");
const path = require("path");
const { checkCooldown } = require("../utils/cooldownManager");
const { cooldown } = require("./credit");

module.exports = {
    name: "help",
    cooldown: 2000,
    description: "Affiche la liste des commandes disponibles",
    utilisation: "/help",

    async execute(interaction) {

        const cooldownResult = checkCooldown(interaction.user.id, this.name, this.cooldown);
        if (cooldownResult !== true) {
            return interaction.reply({ content: cooldownResult, ephemeral: true });
        }

        try {
            const commandsPath = path.join(__dirname);
            const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith(".js"));

            const commands = commandFiles.map(file => {
                const command = require(path.join(commandsPath, file));
                return `🔹 **\`/${command.name}\`** → ${command.description || "*Aucune description disponible*"}`;
            });

            const helpEmbed = new EmbedBuilder()
                .setColor("#ff4655")
                .setTitle("🎯 Valorant Stats – Aide & Commandes")
                .setDescription("🚀 **Valorant Stats** te permet de suivre en temps réel tes performances et statistiques sur Valorant !\n\n🔻 **Voici la liste des commandes disponibles :**")
                .addFields(
                    { name: "📌 Commandes disponibles", value: commands.join("\n"), inline: false },
                    { name: "🎮 Jeux supportés", value: "🔹 **Valorant**", inline: false },
                    { name: "👑 Développeurs", value: "[Awai](https://github.com/DevAwai) & [Khalifouille](https://github.com/Khalifouille)", inline: true },
                    { name: "🛠️ Version", value: "1.0.0", inline: true },
                )
                .setImage("https://media.discordapp.net/attachments/1352700298350821428/1353700694317596732/image.png?ex=67e29b84&is=67e14a04&hm=65ef90c84e8789ba623adde8a063e4aec42326b9c2a3084486d25a93aab4420f&=&format=webp&quality=lossless") // Pied de page
                .setFooter({ text: `💡 Demandé par ${interaction.user.username}`, iconURL: interaction.user.displayAvatarURL() });

            await interaction.reply({ embeds: [helpEmbed] });
        } catch (error) {
            console.error("❌ Erreur lors de l'exécution de la commande /help :", error);
            await interaction.reply({ content: "❌ Une erreur est survenue, réessaie plus tard.", ephemeral: true });
        }
    }
};
