const { InteractionType, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const { updateUserBalance, getUserBalance } = require("../utils/creditsManager");
const { checkCooldown, setCooldown, formatDuration } = require("../utils/cooldownManager");

const METIERS = {
    PECHEUR: { emoji: '🎣', gainMin: 1500, gainMax: 3500 },
    BUCHERON: { emoji: '🪓', gainMin: 2000, gainMax: 5000 },
    CAMIONNEUR: { emoji: '🚚', gainMin: 3000, gainMax: 6000 },
    PETROLIER: { emoji: '⛽', gainMin: 4000, gainMax: 8000 },
    LIVREUR: { emoji: '📦', gainMin: 2500, gainMax: 5000 }
};

const GLOBAL_WORK_COOLDOWN = 2 * 60 * 60 * 1000;

module.exports = async (bot, interaction) => {
    try {
        if (interaction.type === InteractionType.ApplicationCommand) {
            let command = require(`../Commandes/${interaction.commandName}`);
            
            if (!command.execute) {
                return interaction.reply({ 
                    content: "❌ Cette commande ne peut pas être exécutée.", 
                    ephemeral: true 
                });
            }

            await command.execute(interaction);
        } else if (interaction.isButton()) {
            if (interaction.customId.startsWith('work_')) {
                const metier = interaction.customId.split('_')[1];
                const config = METIERS[metier];
                const userId = interaction.user.id;

                const remaining = checkCooldown(userId, 'global_work', GLOBAL_WORK_COOLDOWN);
                if (remaining !== true) {
                    return await interaction.reply({ 
                        content: `⏳ Vous devez attendre ${formatDuration(remaining)} avant de pouvoir travailler à nouveau!`,
                        ephemeral: true 
                    });
                }

                if (metier === "PECHEUR") {
                    await startFishingMiniGame(interaction, userId, config);
                } else {
                    const earnings = Math.floor(Math.random() * (config.gainMax - config.gainMin + 1)) + config.gainMin;
                    updateUserBalance(userId, earnings);
                    setCooldown(userId, 'global_work', GLOBAL_WORK_COOLDOWN);

                    const embed = new EmbedBuilder()
                        .setColor('#4CAF50')
                        .setTitle(`${config.emoji} Travail effectué (${metier})`)
                        .setDescription(`Vous avez gagné **${earnings} vcoins**!`)
                        .addFields(
                            { name: 'Nouveau solde', value: `${getUserBalance(userId)} vcoins`, inline: true },
                            { name: 'Prochain travail possible', value: `<t:${Math.floor((Date.now() + GLOBAL_WORK_COOLDOWN) / 1000)}:R>`, inline: true }
                        );
                    await interaction.reply({ embeds: [embed], ephemeral: true });
                }
            }
        }
    } catch (error) {
        console.error("Erreur dans interactionCreate:", error);
        if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({ 
                content: "❌ Une erreur est survenue lors du traitement de votre action.", 
                ephemeral: true 
            });
        }
    }
};

async function startFishingMiniGame(interaction, userId, config) {
    try {
        const fishingEmbed = new EmbedBuilder()
            .setColor('#0077FF')
            .setTitle('🎣 Vous êtes en train de pêcher...')
            .setDescription('Attendez que le poisson morde...');
        
        await interaction.update({ 
            embeds: [fishingEmbed],
            components: [],
            ephemeral: true
        });

        const waitTime = Math.floor(Math.random() * 5) + 2; 
        setTimeout(async () => {
            const catchButton = new ButtonBuilder()
                .setCustomId('catch_fish')
                .setLabel('Attraper le poisson !')
                .setStyle(ButtonStyle.Success);

            const catchRow = new ActionRowBuilder().addComponents(catchButton);

            const catchEmbed = new EmbedBuilder()
                .setColor('#00FF00')
                .setTitle('🎣 Le poisson mord !')
                .setDescription('Cliquez vite pour attraper le poisson et gagner des vcoins !');

            await interaction.followUp({
                embeds: [catchEmbed],
                components: [catchRow],
                ephemeral: true
            });

            const filter = i => i.customId === 'catch_fish' && i.user.id === interaction.user.id;
            const collector = interaction.channel.createMessageComponentCollector({
                filter,
                time: 5000 
            });

            collector.on('collect', async (collected) => {
                const timeTaken = Date.now() - interaction.createdTimestamp;
                if (timeTaken <= waitTime * 1000) {
                    const earnings = Math.floor(Math.random() * (config.gainMax - config.gainMin + 1)) + config.gainMin;
                    await collected.update({
                        content: `Félicitations ! Vous avez attrapé un poisson et gagné **${earnings} vcoins**! 🎣`,
                        embeds: [],
                        components: [],
                        ephemeral: true
                    });
                    updateUserBalance(userId, earnings);
                } else {
                    await collected.update({
                        content: `Désolé, vous avez raté le poisson! Essayez encore la prochaine fois.`,
                        embeds: [],
                        components: [],
                        ephemeral: true
                    });
                }
            });

            collector.on('end', async () => {
                if (!collector.collected.size) {
                    await interaction.followUp({
                        content: `Le temps est écoulé! Vous n'avez pas attrapé de poisson cette fois.`,
                        ephemeral: true
                    });
                }
            });
        }, waitTime * 1000);
    } catch (error) {
        console.error("Erreur lors du mini-jeu de pêche:", error);
        await interaction.followUp({
            content: "❌ Une erreur est survenue pendant le mini-jeu.",
            ephemeral: true
        });
    }
}
