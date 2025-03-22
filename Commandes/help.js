const { EmbedBuilder, SlashCommandBuilder } = require("discord.js");
const fs = require("fs");
const path = require("path");

module.exports = {
    name: "help",
    description: "Affiche la liste des commandes disponibles",

    async execute(interaction) {
        try {
            const commandsPath = path.join(__dirname); // Chemin du dossier contenant les commandes
            const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith(".js"));

            const commands = commandFiles.map(file => {
                const command = require(path.join(commandsPath, file));
                return `\`/${command.name}\` - ${command.description || "Aucune description"}`;
            });

            const helpEmbed = new EmbedBuilder()
                .setColor("#3498db")
                .setTitle("📜 Liste des commandes")
                .setDescription(commands.join("\n"))
                .setFooter({ text: `Demandé par ${interaction.user.username}`, iconURL: interaction.user.displayAvatarURL() });

            await interaction.reply({ embeds: [helpEmbed] }); // Visible par tous
        } catch (error) {
            console.error("Erreur lors de l'exécution de la commande /help :", error);
            await interaction.reply({ content: "❌ Une erreur est survenue.", ephemeral: true });
        }
    }
};
