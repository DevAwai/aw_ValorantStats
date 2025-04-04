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
                    await startPecheurMiniGame(interaction, userId, config);
                } else if (metier === "BUCHERON") {
                    await startBucheronMiniGame(interaction, userId, config);
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

async function startPecheurMiniGame(interaction, userId, config) {
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
        const timeToShowButton = Date.now() + waitTime * 1000; 

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
                const timeTaken = Date.now() - timeToShowButton; 

                if (timeTaken <= 5000) {
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

async function startBucheronMiniGame(interaction, userId, config) {
    try {
        const totalTrees = 10;
        let remainingTrees = totalTrees;
        const treeEmoji = '🌲';
        const cutEmoji = '🪵';
        
        let forestGrid = Array(4).fill().map(() => Array(3).fill(null));
        
        let treesPlaced = 0;
        while (treesPlaced < totalTrees) {
            const row = Math.floor(Math.random() * 4);
            const col = Math.floor(Math.random() * 3);
            
            if (!forestGrid[row][col]) {
                forestGrid[row][col] = treeEmoji;
                treesPlaced++;
            }
        }

        const generateForestEmbed = () => {
            const embed = new EmbedBuilder()
                .setColor('#4b5320')
                .setTitle('🪓 Abattage des arbres')
                .setDescription(`Cliquez sur le bouton pour couper un arbre\nArbres restants: ${remainingTrees}/${totalTrees}`)
                .setFooter({ text: interaction.user.username, iconURL: interaction.user.displayAvatarURL() });

            for (let i = 0; i < 4; i++) {
                let rowText = '';
                for (let j = 0; j < 3; j++) {
                    rowText += forestGrid[i][j] || '⬛'; 
                    rowText += ' '; 
                }
                embed.addFields({ name: '\u200B', value: rowText, inline: false });
            }

            return embed;
        };

        const cutButton = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('cut_tree')
                .setLabel('Couper un arbre')
                .setEmoji('🪓')
                .setStyle(ButtonStyle.Primary)
        );

        const initialMessage = await interaction.reply({ 
            embeds: [generateForestEmbed()], 
            components: [cutButton],
            fetchReply: true,
            ephemeral: true
        });

        const collector = initialMessage.createMessageComponentCollector({ 
            filter: i => i.user.id === userId,
            time: 60000
        });

        collector.on('collect', async buttonInteraction => {
            await buttonInteraction.deferUpdate();
            await buttonInteraction.editReply({ components: [] });

            const availableTrees = [];
            for (let i = 0; i < 4; i++) {
                for (let j = 0; j < 3; j++) {
                    if (forestGrid[i][j] === treeEmoji) {
                        availableTrees.push([i, j]);
                    }
                }
            }

            if (availableTrees.length === 0) {
                collector.stop();
                return;
            }

            const [row, col] = availableTrees[Math.floor(Math.random() * availableTrees.length)];
            forestGrid[row][col] = cutEmoji;
            remainingTrees--;

            const updatedEmbed = generateForestEmbed();

            if (remainingTrees > 0) {
                const newCutButton = new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId('cut_tree')
                        .setLabel('Couper un arbre')
                        .setEmoji('🪓')
                        .setStyle(ButtonStyle.Primary)
                );

                await buttonInteraction.editReply({ 
                    embeds: [updatedEmbed],
                    components: [newCutButton] 
                });
            } else {
                collector.stop();
                const earnings = Math.floor(Math.random() * (config.gainMax - config.gainMin + 1)) + config.gainMin;
                updateUserBalance(userId, earnings);
                setCooldown(userId, 'global_work', GLOBAL_WORK_COOLDOWN);

                const finalEmbed = new EmbedBuilder()
                    .setColor('#ffd700')
                    .setTitle('✅ Forêt abattue avec succès!')
                    .setDescription(`Vous avez coupé tous les arbres et gagné **${earnings} vcoins**!`)
                    .addFields(
                        { name: 'Nouveau solde', value: `${getUserBalance(userId)} vcoins`, inline: true },
                        { name: 'Prochain travail possible', value: `<t:${Math.floor((Date.now() + GLOBAL_WORK_COOLDOWN) / 1000)}:R>`, inline: true }
                    );

                await buttonInteraction.editReply({ 
                    embeds: [finalEmbed],
                    components: [] 
                });
            }
        });

        collector.on('end', () => {
            if (initialMessage.editable && remainingTrees > 0) {
                initialMessage.edit({ components: [] }).catch(console.error);
            }
        });
    } catch (error) {
        console.error("Erreur dans le mini-jeu de bûcheron:", error);
        await interaction.followUp({
            content: "❌ Une erreur est survenue pendant le mini-jeu.",
            ephemeral: true
        });
    }
}