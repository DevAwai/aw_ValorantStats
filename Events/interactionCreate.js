const { InteractionType, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const { updateUserBalance, getUserBalance } = require("../utils/creditsManager");
const { checkCooldown, setCooldown, formatDuration } = require("../utils/cooldownManager");

const JOBS_CONFIG = {
    PECHEUR: { emoji: '🎣', gainMin: 1500, gainMax: 3500 },
    BUCHERON: { emoji: '🪓', gainMin: 2000, gainMax: 5000 },
    CAMIONNEUR: { emoji: '🚚', gainMin: 3000, gainMax: 6000 },
    PETROLIER: { emoji: '⛽', gainMin: 4000, gainMax: 8000 },
    LIVREUR: { emoji: '📦', gainMin: 2500, gainMax: 5000 }
};

const GLOBAL_WORK_COOLDOWN = 1000; 

module.exports = async (bot, interaction) => {
    if (!interaction.isCommand() && !interaction.isButton() && !interaction.isStringSelectMenu()) return;

    try {
        if (interaction.type === InteractionType.ApplicationCommand) {
            const command = require(`../Commandes/${interaction.commandName}`);
            if (!command?.execute) {
                return interaction.reply({ 
                    content: "❌ Commande non exécutable", 
                    ephemeral: true 
                }).catch(console.error);
            }
            await command.execute(interaction);
        } 
        else if (interaction.isButton()) {
            if (interaction.customId.startsWith('work_')) {
                await handleWorkInteraction(interaction);
            }
            else if (interaction.customId === 'roulette_red' || interaction.customId === 'roulette_black') {
                const rouletteCmd = require('../Commandes/roulette');
                await rouletteCmd.spinWheel(interaction, {
                    betType: 'color',
                    betValue: interaction.customId === 'roulette_red' ? 'red' : 'black',
                    betAmount: interaction.message.embeds[0].fields.find(f => f.name === 'Mise actuelle').value.replace(' VCOINS', '')
                });
            }
            else if (interaction.customId.startsWith('roulette_num_')) {
                const rouletteCmd = require('../Commandes/roulette');
                await rouletteCmd.spinWheel(interaction, {
                    betType: 'straight',
                    betValue: interaction.customId.replace('roulette_num_', ''),
                    betAmount: interaction.message.embeds[0].fields.find(f => f.name === 'Mise actuelle').value.replace(' VCOINS', '')
                });
            }
            else if (interaction.customId.startsWith('roulette_dozen_')) {
                const rouletteCmd = require('../Commandes/roulette');
                await rouletteCmd.spinWheel(interaction, {
                    betType: 'dozen',
                    betValue: interaction.customId.replace('roulette_dozen_', ''),
                    betAmount: interaction.message.embeds[0].fields.find(f => f.name === 'Mise actuelle').value.replace(' VCOINS', '')
                });
            }
        }
        else if (interaction.isStringSelectMenu()) {
            try {
                if (interaction.customId === 'roulette_bet_type') {
                    const rouletteCmd = require('../Commandes/roulette');
                    const betAmount = interaction.message.embeds[0]?.fields
                        .find(f => f.name === 'Mise actuelle')?.value
                        .replace(' VCOINS', '');
                    
                    if (!betAmount) {
                        return interaction.reply({
                            content: "❌ Impossible de déterminer le montant de la mise",
                            ephemeral: true
                        }).catch(console.error);
                    }

                    await rouletteCmd.handleBetType(interaction, parseInt(betAmount));
                }
            } catch (error) {
                console.error("Erreur du menu déroulant roulette:", error);
                if (!interaction.replied) {
                    await interaction.reply({
                        content: "❌ Échec du traitement de votre sélection",
                        ephemeral: true
                    }).catch(console.error);
                } else {
                    await interaction.followUp({
                        content: "❌ Erreur lors du traitement",
                        ephemeral: true
                    }).catch(console.error);
                }
            }
        }
    } catch (error) {
        console.error("Erreur d'interaction:", error);
        
        try {
            if (interaction.deferred) {
                await interaction.followUp({ 
                    content: "❌ Une erreur est survenue", 
                    ephemeral: true 
                }).catch(console.error);
            } else if (interaction.replied) {
                await interaction.editReply({ 
                    content: "❌ Erreur de traitement", 
                    embeds: [],
                    components: []
                }).catch(console.error);
            } else {
                await interaction.reply({ 
                    content: "❌ Erreur de traitement", 
                    ephemeral: true 
                }).catch(console.error);
            }
        } catch (err) {
            console.error("Échec de l'envoi du message d'erreur:", err);
        }
    }
};

async function handleWorkInteraction(interaction) {
    const [_, jobName] = interaction.customId.split('_');
    const jobConfig = JOBS_CONFIG[jobName];
    const userId = interaction.user.id;

    const cooldownStatus = checkCooldown(userId, 'global_work', GLOBAL_WORK_COOLDOWN);
    if (cooldownStatus !== true) {
        return interaction.reply({ 
            content: `⏳ Attendez ${formatDuration(cooldownStatus)}`, 
            ephemeral: true 
        });
    }

    switch(jobName) {
        case 'PECHEUR':
            await startPecheurMiniGame(interaction, userId, jobConfig);
            break;
        case 'BUCHERON':
            await startBucheronMiniGame(interaction, userId, jobConfig);
            break;
        case 'CAMIONNEUR':
            await startCamionneurMiniGame(interaction, userId, jobConfig);
            break;
        case 'PETROLIER':
            await startPetrolierMiniGame(interaction, userId, jobConfig);
            break;
        default:
            await handleSimpleJob(interaction, userId, jobConfig, jobName);
    }
}

async function handleSimpleJob(interaction, userId, config, jobName) {
    const earnings = calculateEarnings(config.gainMin, config.gainMax);
    updateUserBalance(userId, earnings);
    setCooldown(userId, 'global_work', GLOBAL_WORK_COOLDOWN);

    const embed = new EmbedBuilder()
        .setColor('#4CAF50')
        .setTitle(`${config.emoji} ${jobName}`)
        .setDescription(`Gains: **${earnings} vcoins**`)
        .addFields(
            { name: 'Solde', value: `${getUserBalance(userId)} vcoins`, inline: true },
            { name: 'Prochain travail', value: `<t:${Math.floor((Date.now() + GLOBAL_WORK_COOLDOWN) / 1000)}:R>`, inline: true }
        );

    await interaction.reply({ embeds: [embed], ephemeral: true });
}

function calculateEarnings(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

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
    const gameSettings = {
        maxCapacity: 100,
        dangerThreshold: 80,
        explosionThreshold: 95,
        gameDuration: 20000,
        baseEarnings: config.gainMin,
        maxEarnings: config.gainMax
    };

    let gameData = {
        currentLevel: 0,
        hasExploded: false,
        bonusMultiplier: 1.0,
        isActive: true,
        lastAction: null
    };

    const updateGameEmbed = () => {
        const progressBar = [
            '[',
            '▰'.repeat(Math.floor(gameData.currentLevel / 5)),
            '▱'.repeat(20 - Math.floor(gameData.currentLevel / 5)),
            `] ${gameData.currentLevel}%`
        ].join('');

        return new EmbedBuilder()
            .setColor(gameData.hasExploded ? '#FF0000' : 
                     gameData.currentLevel >= gameSettings.explosionThreshold ? '#FFA500' : 
                     gameData.currentLevel >= gameSettings.dangerThreshold ? '#FFFF00' : '#00FF00')
            .setTitle('⛽ Raffinerie Pétrolière')
            .setDescription([
                `**Niveau de remplissage:**`,
                progressBar,
                gameData.hasExploded ? '💥 **EXPLOSION!**' : '',
                gameData.currentLevel >= gameSettings.explosionThreshold ? '⚠️ **DANGER CRITIQUE**' : ''
            ].filter(Boolean).join('\n'))
            .addFields(
                { name: 'Multiplicateur', value: `x${gameData.bonusMultiplier.toFixed(1)}`, inline: true },
                { name: 'Temps restant', value: gameData.isActive ? 
                    `${Math.ceil((gameSettings.gameDuration - (Date.now() - gameData.lastAction)) / 1000)}s` : 'Terminé', 
                  inline: true }
            );
    };

    const gameButtons = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('oil_pump_action')
            .setLabel('POMPER (+8%)')
            .setStyle(ButtonStyle.Primary)
            .setEmoji('⛽'),
        new ButtonBuilder()
            .setCustomId('oil_stabilize_action')
            .setLabel('STABILISER (-5%)')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('🛠️')
    );

    try {
        gameData.lastAction = Date.now();
        const gameMessage = await interaction.reply({
            embeds: [updateGameEmbed()],
            components: [gameButtons],
            fetchReply: true,
            ephemeral: true
        });

        const actionCollector = gameMessage.createMessageComponentCollector({
            filter: i => i.user.id === userId && i.isButton(),
            time: gameSettings.gameDuration
        });

        actionCollector.on('collect', async buttonInteraction => {
            if (!gameData.isActive) return;

            try {
                if (buttonInteraction.customId === 'oil_pump_action') {
                    gameData.currentLevel += 8;
                    
                    if (Math.random() < 0.15) {
                        gameData.bonusMultiplier += 0.1;
                    }
                } 
                else if (buttonInteraction.customId === 'oil_stabilize_action') {
                    gameData.currentLevel = Math.max(0, gameData.currentLevel - 5);
                }

                if (gameData.currentLevel >= gameSettings.explosionThreshold) {
                    gameData.hasExploded = true;
                    gameData.isActive = false;
                }

                gameData.lastAction = Date.now();

                await buttonInteraction.update({
                    embeds: [updateGameEmbed()],
                    components: gameData.isActive ? [gameButtons] : []
                });

            } catch (error) {
                console.error('Erreur de traitement:', error);
                if (buttonInteraction.deferred || buttonInteraction.replied) {
                    await buttonInteraction.editReply({
                        content: '⚠️ Action non traitée',
                        components: []
                    });
                } else {
                    await buttonInteraction.reply({
                        content: '⚠️ Action non traitée',
                        ephemeral: true
                    });
                }
            }
        });

        actionCollector.on('end', async () => {
            gameData.isActive = false;

            let finalEarnings;
            if (gameData.hasExploded) {
                finalEarnings = Math.floor(gameSettings.baseEarnings * 0.3 * gameData.bonusMultiplier);
            } else if (gameData.currentLevel >= gameSettings.dangerThreshold) {
                const progressBonus = (gameData.currentLevel - gameSettings.dangerThreshold) * 50;
                finalEarnings = Math.min(
                    gameSettings.maxEarnings,
                    Math.floor((gameSettings.baseEarnings + progressBonus) * gameData.bonusMultiplier)
                );
            } else {
                finalEarnings = Math.floor(gameSettings.baseEarnings * gameData.bonusMultiplier);
            }

            updateUserBalance(userId, finalEarnings);
            setCooldown(userId, 'global_work', GLOBAL_WORK_COOLDOWN);

            const resultEmbed = new EmbedBuilder()
                .setColor(gameData.hasExploded ? '#FF0000' : '#4CAF50')
                .setTitle(gameData.hasExploded ? '💥 Explosion du réservoir!' : '✅ Mission accomplie')
                .setDescription(`**Gains obtenus:** ${finalEarnings} vcoins`)
                .addFields(
                    { name: 'Remplissage final', value: `${gameData.currentLevel}%`, inline: true },
                    { name: 'Bonus', value: `x${gameData.bonusMultiplier.toFixed(1)}`, inline: true }
                );

            await interaction.editReply({
                embeds: [resultEmbed],
                components: []
            });
        });

    } catch (initError) {
        console.error('Erreur initialisation:', initError);
        if (!interaction.replied) {
            await interaction.reply({
                content: '❌ Échec du démarrage du système pétrolier',
                ephemeral: true
            });
        }
    }
}