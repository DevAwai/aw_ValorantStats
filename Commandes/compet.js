const { ActionRowBuilder, EmbedBuilder, StringSelectMenuBuilder } = require('discord.js');
const { handleError } = require("../utils/errorHandler");

module.exports = {
    name: "compet",
    description: "Affiche toutes les compétences disponibles à l'achat",
    cooldown: 2000,
    options: [],

    async execute(interaction) {
        try {
            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId('competence_select')
                .setPlaceholder('Sélectionnez une compétence pour voir les détails')
                .addOptions([
                    {
                        label: 'Voleur',
                        description: 'Voler des vcoins à d\'autres joueurs',
                        value: 'voleur',
                        emoji: '🕵️‍♂️'
                    },
                    {
                        label: 'Travailleur',
                        description: 'Accéder à des métiers rémunérateurs',
                        value: 'travailleur',
                        emoji: '💼'
                    },
                    {
                        label: 'Antivol',
                        description: 'Protection contre les vols',
                        value: 'antivol',
                        emoji: '🛡️'
                    },
                    {
                        label: 'Chômeur',
                        description: 'Gagne de la thune sans rien faire comme IRL',
                        value: 'chomeur',
                        emoji: '🛌'
                    },
                    {
                        label: 'Offshore',
                        description: 'Protéger son argent des taxes',
                        value: 'offshore',
                        emoji: '🏦'
                    }
                ]);

            const row = new ActionRowBuilder().addComponents(selectMenu);

            const embed = new EmbedBuilder()
                .setColor('#0099ff')
                .setTitle('Compétences Disponibles')
                .setDescription('Sélectionnez une compétence dans le menu ci-dessous pour voir ses détails:');

            const message = await interaction.reply({ 
                embeds: [embed], 
                components: [row],
                ephemeral: true,
                fetchReply: true
            });

            const collector = message.createMessageComponentCollector({
                filter: i => i.user.id === interaction.user.id,
                time: 60000
            });

            collector.on('collect', async i => {
                try {
                    const selected = i.values[0];
                    let detailsEmbed;

                    switch(selected) {
                        case 'voleur':
                            detailsEmbed = new EmbedBuilder()
                                .setColor('#FF0000')
                                .setTitle('🕵️‍♂️ Voleur')
                                .setDescription('Compétence de vol')
                                .addFields(
                                    { name: 'Prix', value: '10,000 vcoins', inline: true },
                                    { name: 'Chance de succès', value: '1 sur 10', inline: true },
                                    { name: 'Gain possible', value: '1-5000 vcoins par vol', inline: true }
                                );
                            break;
                        
                        case 'travailleur':
                            detailsEmbed = new EmbedBuilder()
                                .setColor('#FFA500')
                                .setTitle('💼 Travailleur')
                                .setDescription('Accès aux métiers rémunérateurs')
                                .addFields(
                                    { name: 'Prix', value: '15,000 vcoins', inline: true },
                                    { name: 'Avantage', value: 'Débloque la commande /travailler', inline: true },
                                    { name: 'Métiers disponibles', value: '5 métiers différents', inline: true }
                                );
                            break;
                        
                        case 'antivol':
                            detailsEmbed = new EmbedBuilder()
                                .setColor('#00FF00')
                                .setTitle('🛡️ Antivol')
                                .setDescription('Protection contre les voleurs')
                                .addFields(
                                    { name: 'Prix', value: '10,000 vcoins', inline: true },
                                    { name: 'Protections', value: '1 protection par achat', inline: true },
                                    { name: 'Maximum', value: '3 protections simultanées', inline: true }
                                );
                            break;
                            
                        case 'chomeur':
                            detailsEmbed = new EmbedBuilder()
                                .setColor('#7289DA')
                                .setTitle('🛌 Chômeur')
                                .setDescription('Allocation de chômage régulière')
                                .addFields(
                                    { name: 'Prix', value: '20,000 vcoin', inline: true },
                                    { name: 'Allocation', value: '5000 vcoins toutes les 5 minutes', inline: true },
                                    { name: 'Condition', value: 'Doit être en ligne sur Discord', inline: true },
                                    { name: 'Incompatibilité', value: 'Impossible avec la compétence Travailleur', inline: false }
                                );
                            break;
        
                        case 'offshore':
                            detailsEmbed = new EmbedBuilder()
                                .setColor('#00FFFF')
                                .setTitle('🏦 Offshore')
                                .setDescription('Protection fiscale')
                                .addFields(
                                    { name: 'Prix', value: '50,000 vcoins', inline: true },
                                    { name: 'Avantage', value: 'Protège 50% de votre solde des taxes', inline: true },
                                    { name: 'Note', value: 'Une seule protection offshore possible', inline: true }
                                );
                            break;
                    }

                    await i.update({ 
                        embeds: [detailsEmbed], 
                        components: [] 
                    });
                } catch (error) {
                    console.error('Erreur lors du traitement de la sélection:', error);
                    if (!i.replied && !i.deferred) {
                        await i.reply({ 
                            content: '❌ Une erreur est survenue lors du traitement de votre sélection', 
                            ephemeral: true 
                        });
                    }
                }
            });

            collector.on('end', (collected, reason) => {
                if (reason === 'time') {
                    interaction.editReply({ 
                        content: 'Temps écoulé - sélection annulée', 
                        components: [] 
                    }).catch(console.error);
                }
            });

        } catch (error) {
            console.error('Erreur dans la commande compet:', error);
            await handleError(interaction, error, "API");
        }
    }
};