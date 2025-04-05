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
                } else if (metier === "CAMIONNEUR") {
                    await startCamionneurMiniGame(interaction, userId, config);
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
    try {
        const DELIVERY_TIME = 30000;
        const BASE_EARNINGS = Math.floor(Math.random() * (config.gainMax - config.gainMin + 1)) + config.gainMin;
        const destinations = [
            { name: "Entrepôt Nord", emoji: "🏭", distance: 8 },
            { name: "Centre Ville", emoji: "🏙️", distance: 5 },
            { name: "Zone Industrielle", emoji: "🏗️", distance: 10 }
        ];

        const destination = destinations[Math.floor(Math.random() * destinations.length)];

        const createRouteVisual = (progress) => {
            const totalSegments = 20;
            const progressSegments = Math.min(totalSegments, Math.floor((progress / destination.distance) * totalSegments));
            return `[DÉPART] ${"▬".repeat(progressSegments)}🚛${"▬".repeat(totalSegments - progressSegments)} ${destination.emoji} [ARRIVÉE]`;
        };

        const initialEmbed = new EmbedBuilder()
            .setColor('#FFA500')
            .setTitle('🚚 MISSION DE LIVRAISON')
            .setDescription(`**Destination:** ${destination.name} ${destination.emoji}\n\n${createRouteVisual(0)}`)
            .addFields(
                { name: 'Temps restant', value: `30 secondes`, inline: true },
                { name: 'Gain potentiel', value: `${BASE_EARNINGS} vcoins`, inline: true }
            );

        const driveButton = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('drive_truck')
                .setLabel('CONDURE')
                .setEmoji('🚛')
                .setStyle(ButtonStyle.Primary)
        );

        let progress = 0;
        let startTime = Date.now();
        let isDriving = false;
        let gameActive = true;
        let message;

        try {
            message = await interaction.reply({ 
                embeds: [initialEmbed], 
                components: [driveButton],
                fetchReply: true,
                ephemeral: true
            });
        } catch (err) {
            console.error("Erreur lors de l'envoi du message initial:", err);
            return;
        }

        const safeEdit = async (newEmbed, components = []) => {
            try {
                if (message && gameActive) {
                    await message.edit({ 
                        embeds: [newEmbed], 
                        components 
                    });
                }
            } catch (err) {
                console.error("Erreur lors de l'édition du message:", err);
                gameActive = false;
            }
        };

        const updateGame = async () => {
            if (!gameActive) return;

            const timeLeft = Math.max(0, startTime + DELIVERY_TIME - Date.now());
            const timeLeftSeconds = Math.ceil(timeLeft / 1000);

            const updatedEmbed = new EmbedBuilder()
                .setColor('#FFA500')
                .setTitle('🚚 MISSION DE LIVRAISON')
                .setDescription(`**Destination:** ${destination.name} ${destination.emoji}\n\n${createRouteVisual(progress)}`)
                .addFields(
                    { name: 'Temps restant', value: `${timeLeftSeconds} secondes`, inline: true },
                    { name: 'Progression', value: `${Math.min(100, Math.floor((progress / destination.distance) * 100))}%`, inline: true }
                );

            await safeEdit(updatedEmbed, isDriving ? [] : [driveButton]);
        };

        const gameInterval = setInterval(async () => {
            if (!gameActive) {
                clearInterval(gameInterval);
                return;
            }

            if (isDriving) {
                progress += 0.2 + Math.random() * 0.3;
                
                if (progress >= destination.distance) {
                    clearInterval(gameInterval);
                    await completeDelivery(true);
                }
            }

            await updateGame();

            if (Date.now() > startTime + DELIVERY_TIME) {
                clearInterval(gameInterval);
                await completeDelivery(false);
            }
        }, 1000);

        const collector = message.createMessageComponentCollector({ 
            filter: i => i.user.id === userId,
            time: DELIVERY_TIME
        });

        collector.on('collect', async i => {
            if (i.customId === 'drive_truck') {
                isDriving = true;
                try {
                    await i.deferUpdate();
                    await updateGame();
                } catch (err) {
                    console.error("Erreur lors de la gestion de l'interaction:", err);
                }
            }
        });

        collector.on('end', () => {
            gameActive = false;
        });

        async function completeDelivery(success) {
            gameActive = false;
            
            if (success) {
                const timeTaken = Date.now() - startTime;
                const timeBonus = Math.floor((DELIVERY_TIME - timeTaken) / DELIVERY_TIME * BASE_EARNINGS * 0.5);
                const totalEarnings = BASE_EARNINGS + timeBonus;
                
                updateUserBalance(userId, totalEarnings);
                setCooldown(userId, 'global_work', GLOBAL_WORK_COOLDOWN);

                const successEmbed = new EmbedBuilder()
                    .setColor('#4CAF50')
                    .setTitle('✅ LIVRAISON RÉUSSIE!')
                    .setDescription(`Livraison à ${destination.name} en ${Math.floor(timeTaken/1000)}s`)
                    .addFields(
                        { name: 'Gain total', value: `${totalEarnings} vcoins`, inline: false },
                        { name: 'Nouveau solde', value: `${getUserBalance(userId)} vcoins`, inline: true }
                    );

                await safeEdit(successEmbed);
            } else {
                const failedEmbed = new EmbedBuilder()
                    .setColor('#FF0000')
                    .setTitle('❌ LIVRAISON ÉCHOUÉE')
                    .setDescription(`Temps écoulé avant d'arriver à ${destination.name}`);

                await safeEdit(failedEmbed);
            }
        }

    } catch (error) {
        console.error("Erreur dans le mini-jeu de camionneur:", error);
        try {
            await interaction.followUp({
                content: "❌ Une erreur est survenue pendant la livraison.",
                ephemeral: true
            });
        } catch (err) {
            console.error("Échec de l'envoi du message d'erreur:", err);
        }
    }
}