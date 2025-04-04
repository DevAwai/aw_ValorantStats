const { InteractionType, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require("discord.js");
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
                    ephemeral: false
                });
            }

            await command.execute(interaction);
        }
        
        else if (interaction.isButton()) {
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