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

const GLOBAL_WORK_COOLDOWN = 1000;

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
                } else if (metier === "CAMIONNEUR") {
                    await startCamionneurMiniGame(interaction, userId, config);
                } else if (metier === "PETROLIER") {
                    await startPetrolierMiniGame(interaction, userId, config);
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
        const waitingEmbed = new EmbedBuilder()
            .setColor('#1E90FF')
            .setTitle('🎣 Pêche en cours...')
            .setDescription('Vous lancez votre ligne et attendez qu\'un poisson morde...')
            .setFooter({ text: 'Préparez-vous à réagir vite !' });

        await interaction.reply({ 
            embeds: [waitingEmbed],
            ephemeral: true 
        });

        const biteTime = Math.floor(Math.random() * 5000) + 3000;
        const biteTimestamp = Date.now() + biteTime;

        setTimeout(async () => {
            const biteEmbed = new EmbedBuilder()
                .setColor('#FF4500')
                .setTitle('❗ UNE PRISE ! ❗')
                .setDescription('VITE ! Cliquez pour attraper le poisson !');

            const catchButton = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('catch_fish')
                    .setLabel('ATTRAPER !')
                    .setEmoji('🎣')
                    .setStyle(ButtonStyle.Success)
            );

            const biteMessage = await interaction.editReply({ 
                embeds: [biteEmbed], 
                components: [catchButton] 
            });

            const reactionCollector = biteMessage.createMessageComponentCollector({ 
                filter: i => i.user.id === userId,
                time: 2000 
            });

            reactionCollector.on('collect', async buttonInteraction => {
                const reactionTime = Date.now() - biteTimestamp;
                const success = reactionTime < 2000; 

                if (success) {
                    const baseEarnings = Math.floor(Math.random() * (config.gainMax - config.gainMin + 1)) + config.gainMin;
                    const speedBonus = Math.floor((2000 - reactionTime) / 2000 * baseEarnings * 0.5);
                    const totalEarnings = baseEarnings + speedBonus;

                    updateUserBalance(userId, totalEarnings);
                    setCooldown(userId, 'global_work', GLOBAL_WORK_COOLDOWN);

                    const successEmbed = new EmbedBuilder()
                        .setColor('#4CAF50')
                        .setTitle('🎣 PRISE RÉUSSIE !')
                        .setDescription(`Vous avez attrapé un poisson et gagné **${totalEarnings} vcoins** !\n(Bonus de rapidité: +${speedBonus})`)
                        .addFields(
                            { name: 'Nouveau solde', value: `${getUserBalance(userId)} vcoins`, inline: true },
                            { name: 'Prochain travail possible', value: `<t:${Math.floor((Date.now() + GLOBAL_WORK_COOLDOWN) / 1000)}:R>`, inline: true }
                        );

                    await buttonInteraction.update({ 
                        embeds: [successEmbed],
                        components: [] 
                    });
                } else {
                    await buttonInteraction.update({ 
                        content: 'Trop lent ! Le poisson s\'est échappé...',
                        embeds: [],
                        components: [] 
                    });
                }
            });

            reactionCollector.on('end', async () => {
                if (!reactionCollector.collected.size) {
                    await interaction.editReply({ 
                        content: 'Le poisson est parti... Vous n\'avez pas réagi à temps !',
                        embeds: [],
                        components: [] 
                    });
                }
            });

        }, biteTime);

    } catch (error) {
        console.error("Erreur dans le mini-jeu de pêche:", error);
        await interaction.followUp({
            content: "❌ Une erreur est survenue pendant la pêche.",
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

async function startCamionneurMiniGame(interaction, userId, config) {
    const gameConfig = {
        duration: 30000, 
        baseEarnings: Math.floor(Math.random() * (config.gainMax - config.gainMin + 1)) + config.gainMin,
        destinations: [
            { name: "Daronne à Morai", emoji: "🐩", distance: 10 },
            { name: "Daronne à Youness", emoji: "🐩", distance: 7 },
            { name: "Chez Khali", emoji: "🧍‍♂️", distance: 12 }
        ],
        progressPerClick: 1.2
    };

    const gameState = {
        active: true,
        destination: gameConfig.destinations[Math.floor(Math.random() * gameConfig.destinations.length)],
        progress: 0,
        startTime: Date.now(),
        message: null,
        completed: false
    };

    const createMainEmbed = () => {
        const timeLeft = Math.max(0, gameState.startTime + gameConfig.duration - Date.now());
        return new EmbedBuilder()
            .setColor('#FFA500')
            .setTitle('🚚 LIVRAISON EXPRESS')
            .setDescription(`**${gameState.destination.name}** ${gameState.destination.emoji}\n${createRouteVisual()}`)
            .addFields(
                { name: 'Temps', value: `${Math.ceil(timeLeft/1000)}s`, inline: true },
                { name: 'Progression', value: `${Math.min(100, Math.floor((gameState.progress/gameState.destination.distance)*100))}%`, inline: true },
                { name: 'Gain possible', value: `${gameConfig.baseEarnings}vcoins`, inline: true }
            );
    };

    const createRouteVisual = () => {
        const segments = 20;
        const filled = Math.min(segments, Math.floor((gameState.progress / gameState.destination.distance) * segments));
        return `[DÉPART] ${'▬'.repeat(filled)}🚛${'▬'.repeat(segments - filled)} ${gameState.destination.emoji} [ARRIVÉE]`;
    };

    const endGame = async (success) => {
        if (gameState.completed) return;
        gameState.completed = true;
        gameState.active = false;

        const earnings = success ? gameConfig.baseEarnings : Math.floor(gameConfig.baseEarnings * 0.3);
        
        updateUserBalance(userId, earnings);
        setCooldown(userId, 'global_work', GLOBAL_WORK_COOLDOWN);

        const resultEmbed = new EmbedBuilder()
            .setColor(success ? '#4CAF50' : '#FF0000')
            .setTitle(success ? '✅ LIVRAISON RÉUSSIE' : '❌ TEMPS ÉCOULÉ')
            .setDescription(`**${gameState.destination.name}** ${gameState.destination.emoji}`)
            .addFields(
                { name: 'Statut', value: success ? 'Mission accomplie' : 'Livraison partielle', inline: true },
                { name: 'Gagné', value: `${earnings}vcoins`, inline: true },
                { name: 'Nouveau solde', value: `${getUserBalance(userId)}vcoins`, inline: false },
                { name: 'Prochaine course', value: `<t:${Math.floor((Date.now() + GLOBAL_WORK_COOLDOWN)/1000)}:R>`, inline: false }
            );

        await interaction.followUp({
            embeds: [resultEmbed],
            ephemeral: true
        });
    };

    try {
        gameState.message = await interaction.reply({
            embeds: [createMainEmbed()],
            components: [new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('drive_truck')
                    .setLabel('ACCÉLÉRER')
                    .setEmoji('⏩')
                    .setStyle(ButtonStyle.Primary)
            )],
            fetchReply: true
        });

        const collector = gameState.message.createMessageComponentCollector({ 
            filter: i => i.user.id === userId,
            time: gameConfig.duration
        });

        collector.on('collect', async i => {
            if (!gameState.active) return;
            
            gameState.progress += gameConfig.progressPerClick + (Math.random() * 0.5);
            
            if (gameState.progress >= gameState.destination.distance) {
                await endGame(true);
                collector.stop();
                return;
            }

            try {
                await i.deferUpdate();
                await gameState.message.edit({ 
                    embeds: [createMainEmbed()],
                    components: [new ActionRowBuilder().addComponents(
                        new ButtonBuilder()
                            .setCustomId('drive_truck')
                            .setLabel('ACCÉLÉRER')
                            .setEmoji('⏩')
                            .setStyle(ButtonStyle.Primary)
                    )]
                });
            } catch (error) {
                console.log("Erreur d'édition:", error);
            }
        });

        collector.on('end', () => {
            if (!gameState.completed) {
                endGame(false);
            }
        });

        setTimeout(() => {
            if (gameState.active) collector.stop();
        }, gameConfig.duration);

    } catch (error) {
        console.error("Erreur:", error);
        await interaction.followUp({ 
            content: "❌ Le système de livraison a rencontré une erreur", 
            ephemeral: true 
        });
    }
}

async function startPetrolierMiniGame(interaction, userId, config) {
    const gameConfig = {
        maxGauge: 100,
        dangerZone: 80,
        criticalZone: 95,
        duration: 20000, 
        pumpIncrement: 8,
        stabilizeDecrement: 5
    };

    let gameState = {
        gauge: 0,
        exploded: false,
        leaks: 0,
        multiplier: 1.0,
        active: true
    };

    const createGameEmbed = () => {
        const gaugeBar = '▰'.repeat(Math.floor(gameState.gauge / 5)) + '▱'.repeat(20 - Math.floor(gameState.gauge / 5));
        
        return new EmbedBuilder()
            .setColor(gameState.exploded ? '#FF0000' : 
                     gameState.gauge >= gameConfig.criticalZone ? '#FFA500' : '#4CAF50')
            .setTitle('⛽ Raffinerie Pétrolière')
            .setDescription([
                `**Niveau du réservoir:** ${gameState.gauge}%`,
                `[${gaugeBar}]`,
                gameState.gauge >= gameConfig.criticalZone ? '**DANGER CRITIQUE** ⚠️' : ''
            ].join('\n'))
            .addFields(
                { name: 'Multiplicateur', value: `x${gameState.multiplier.toFixed(1)}`, inline: true },
                { name: 'Fuites', value: gameState.leaks.toString(), inline: true }
            );
    };

    const actionRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('petrolier_pump')
            .setLabel('POMPER')
            .setEmoji('⛽')
            .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
            .setCustomId('petrolier_stabilize')
            .setLabel('STABILISER')
            .setEmoji('🛠️')
            .setStyle(ButtonStyle.Secondary)
    );

    try {
        const message = await interaction.reply({
            embeds: [createGameEmbed()],
            components: [actionRow],
            fetchReply: true,
            ephemeral: true
        });

        const collector = message.createMessageComponentCollector({
            filter: i => i.user.id === userId,
            time: gameConfig.duration
        });

        collector.on('collect', async i => {
            if (!gameState.active) return;

            try {
                if (i.customId === 'petrolier_pump') {
                    gameState.gauge += gameConfig.pumpIncrement;
                    
                    if (gameState.gauge >= gameConfig.maxGauge) {
                        gameState.exploded = true;
                        gameState.active = false;
                    }
                    
                    if (Math.random() < 0.15) {
                        gameState.multiplier += 0.1;
                        await i.followUp({
                            content: 'Bonus: Rendement amélioré (+0.1x)',
                            ephemeral: true
                        });
                    }
                } 
                else if (i.customId === 'petrolier_stabilize') {
                    gameState.gauge = Math.max(0, gameState.gauge - gameConfig.stabilizeDecrement);
                    
                    if (Math.random() < 0.1) {
                        gameState.leaks++;
                        gameState.gauge -= 5;
                        await i.followUp({
                            content: 'Alerte: Fuite détectée! (-5%)',
                            ephemeral: true
                        });
                    }
                }

                await i.update({
                    embeds: [createGameEmbed()],
                    components: gameState.active ? [actionRow] : []
                });

            } catch (error) {
                console.error('Erreur interaction:', error);
                if (!i.replied) {
                    await i.reply({ 
                        content: 'Erreur lors du traitement', 
                        ephemeral: true 
                    }).catch(console.error);
                }
            }
        });

        collector.on('end', async () => {
            gameState.active = false;
            
            let earnings;
            if (gameState.exploded) {
                earnings = Math.floor(config.gainMin * 0.3 * gameState.multiplier);
            } else if (gameState.gauge >= gameConfig.dangerZone) {
                earnings = Math.floor(
                    (config.gainMin + (gameState.gauge - gameConfig.dangerZone)) * gameState.multiplier
                );
            } else {
                earnings = Math.floor(config.gainMin * gameState.multiplier);
            }

            updateUserBalance(userId, earnings);
            setCooldown(userId, 'global_work', GLOBAL_WORK_COOLDOWN);

            const resultEmbed = new EmbedBuilder()
                .setColor(gameState.exploded ? '#FF0000' : '#4CAF50')
                .setTitle(gameState.exploded ? '💥 Explosion!' : '✅ Mission accomplie')
                .setDescription(`Gains: ${earnings} vcoins`)
                .addFields(
                    { name: 'Niveau final', value: `${gameState.gauge}%`, inline: true },
                    { name: 'Multiplicateur', value: `x${gameState.multiplier.toFixed(1)}`, inline: true }
                );

            await interaction.editReply({
                embeds: [resultEmbed],
                components: []
            });
        });

    } catch (error) {
        console.error('Erreur initiale:', error);
        if (!interaction.replied) {
            await interaction.reply({
                content: '❌ Le système pétrolier a rencontré une erreur',
                ephemeral: true
            });
        }
    }
}