const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { loadCredits } = require("../utils/creditsManager");
const { checkCooldown } = require("../utils/cooldownManager");

function splitIntoChunks(lines, maxLength = 1024) {
    const chunks = [];
    let currentChunk = '';

    for (const line of lines) {
        if ((currentChunk + line + '\n').length > maxLength) {
            chunks.push(currentChunk);
            currentChunk = '';
        }
        currentChunk += line + '\n';
    }

    if (currentChunk) {
        chunks.push(currentChunk);
    }

    return chunks;
}

module.exports = {
    name: "soldeall",
    description: "Affiche le solde de tous les joueurs",
    cooldown: 2000,
    utilisation: "/soldeall",
    options: [],
    async execute(interaction) {
        const cooldownResult = checkCooldown(interaction.user.id, this.name, this.cooldown);
        if (cooldownResult !== true) {
            return interaction.reply({ content: cooldownResult, ephemeral: true });
        }

        try {
            const credits = loadCredits();

            if (Object.keys(credits).length === 0) {
                return interaction.reply({
                    content: "❌ Aucun joueur n'a encore de solde enregistré.",
                    ephemeral: true,
                });
            }

            const sortedCredits = Object.entries(credits).sort(([, a], [, b]) => b - a);
            const lines = sortedCredits.map(([userId, balance]) => `<@${userId}> : **${balance} VCOINS**`);
            const chunks = splitIntoChunks(lines);

            const embed = new EmbedBuilder()
                .setColor("#00FF00")
                .setTitle("💰 Solde de tous les joueurs")
                .setDescription("Voici la liste des joueurs et leurs VCOINS :")
                .setFooter({ text: "Casino Valorant Stats", iconURL: interaction.client.user.displayAvatarURL() })
                .setTimestamp();

            chunks.forEach((chunk, i) => {
                embed.addFields({ name: `\u200B`, value: chunk });
            });

            await interaction.reply({ embeds: [embed], ephemeral: false });
        } catch (error) {
            console.error("Erreur lors de l'exécution de la commande /soldeall :", error);
            await interaction.reply({
                content: "❌ Une erreur est survenue lors de l'exécution de la commande.",
                ephemeral: true,
            });
        }
    },
};
