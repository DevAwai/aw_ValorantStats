const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { loadTrackedPlayers } = require("../utils/trackedPlayers");
const { handleError } = require("../utils/errorHandler");
const { checkCooldown } = require("../utils/cooldownManager");
const { cooldown } = require("./matches");

module.exports = {
    name: "listesuivi",
    description: "Affiche la liste des joueurs suivis par le bot",
    cooldown: 2000,
    permissions: "Aucune",
    utilisation: "/listesuivi",
    dm: false,

    async execute(interaction) {
        const cooldownResult = checkCooldown(interaction.user.id, this.data.name, this.cooldown);
        if (cooldownResult !== true) {
            return interaction.reply({ content: cooldownResult, ephemeral: true });
        }

        try {
            const trackedPlayers = loadTrackedPlayers();
            const totalPlayers = trackedPlayers.length;

            if (totalPlayers === 0) {
                const emptyEmbed = new EmbedBuilder()
                    .setColor("#e74c3c")
                    .setTitle("📋 Liste des joueurs suivis")
                    .setDescription("ℹ️ Aucun joueur n'est actuellement suivi.")
                    .setFooter({ 
                        text: `Demandé par ${interaction.user.username}`, 
                        iconURL: interaction.user.displayAvatarURL() 
                    });
                
                return interaction.reply({ embeds: [emptyEmbed], ephemeral: true });
            }

            const playersPerPage = 10;
            const pages = Math.ceil(totalPlayers / playersPerPage);
            let currentPage = 1;

            const generateEmbed = (page) => {
                const startIdx = (page - 1) * playersPerPage;
                const endIdx = Math.min(startIdx + playersPerPage, totalPlayers);
                const playersList = trackedPlayers
                    .slice(startIdx, endIdx)
                    .map((player, idx) => `**${startIdx + idx + 1}.** ${player.name}#${player.tag}`)
                    .join("\n");

                return new EmbedBuilder()
                    .setTitle(`📋 Liste des joueurs suivis (${totalPlayers})`)
                    .setColor("#3498db")
                    .setDescription(playersList)
                    .setFooter({ 
                        text: `Page ${page}/${pages} • Demandé par ${interaction.user.username}`, 
                        iconURL: interaction.user.displayAvatarURL() 
                    })
                    .setTimestamp();
            };

            const embed = generateEmbed(currentPage);
            const reply = await interaction.reply({ 
                embeds: [embed],
                fetchReply: true 
            });

            if (pages > 1) {
                await reply.react('⬅️');
                await reply.react('➡️');

                const filter = (reaction, user) => {
                    return ['⬅️', '➡️'].includes(reaction.emoji.name) && 
                           user.id === interaction.user.id;
                };

                const collector = reply.createReactionCollector({ 
                    filter, 
                    time: 60000,
                    dispose: true 
                });

                collector.on('collect', async (reaction, user) => {
                    try {
                        if (reaction.emoji.name === '⬅️' && currentPage > 1) {
                            currentPage--;
                        } else if (reaction.emoji.name === '➡️' && currentPage < pages) {
                            currentPage++;
                        }

                        await reply.edit({ 
                            embeds: [generateEmbed(currentPage)] 
                        });
                        await reaction.users.remove(user.id);
                    } catch (error) {
                        console.error("Erreur navigation pages:", error);
                    }
                });

                collector.on('end', () => {
                    reply.reactions.removeAll().catch(console.error);
                });
            }

        } catch (error) {
            await handleError(interaction, error, "API");
        }
    },
};