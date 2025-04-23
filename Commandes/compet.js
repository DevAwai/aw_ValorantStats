const { ActionRowBuilder, EmbedBuilder, StringSelectMenuBuilder } = require('discord.js');
const { handleError } = require("../utils/errorHandler");

const COMPETENCES = {
    "Voleur": {
        emoji: '🕵️‍♂️',
        description: 'Voler des vcoins à d\'autres joueurs',
        details: [
            { name: 'Prix', value: '10,000 vcoins', inline: true },
            { name: 'Chance de succès', value: '1 sur 10', inline: true },
            { name: 'Gain possible', value: '1-5000 vcoins par vol', inline: true }
        ],
        color: '#FF0000'
    },
    "Travailleur": {
        emoji: '💼',
        description: 'Accéder à des métiers rémunérateurs',
        details: [
            { name: 'Prix', value: '15,000 vcoins', inline: true },
            { name: 'Avantage', value: 'Débloque la commande /travailler', inline: true },
            { name: 'Métiers disponibles', value: '5 métiers différents', inline: true }
        ],
        color: '#FFA500'
    },
    "Antivol": {
        emoji: '🛡️',
        description: 'Protection contre les vols',
        details: [
            { name: 'Prix', value: '10,000 vcoins', inline: true },
            { name: 'Protections', value: '1 protection par achat', inline: true },
            { name: 'Maximum', value: '3 protections simultanées', inline: true }
        ],
        color: '#00FF00'
    },
    "Chômeur": {
        emoji: '🛌',
        description: 'Gagne de la thune sans rien faire',
        details: [
            { name: 'Prix', value: '20,000 vcoins', inline: true },
            { name: 'Allocation', value: '5000 vcoins toutes les 5 minutes', inline: true },
            { name: 'Condition', value: 'Doit être en ligne sur Discord', inline: true },
            { name: 'Incompatibilité', value: 'Impossible avec la compétence Travailleur', inline: false }
        ],
        color: '#7289DA'
    },
    "Offshore": {
        emoji: '🏦',
        description: 'Protéger son argent des taxes',
        details: [
            { name: 'Prix', value: '50,000 vcoins', inline: true },
            { name: 'Avantage', value: 'Protège 50% de votre solde des taxes', inline: true },
            { name: 'Note', value: 'Une seule protection offshore possible', inline: true }
        ],
        color: '#00FFFF'
    }
};

module.exports = {
    name: "compet",
    description: "Affiche toutes les compétences disponibles à l'achat",
    cooldown: 2000,
    utilisation: "/compet",
    options: [],

    async execute(interaction) {
        try {
            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId('competence_select')
                .setPlaceholder('Sélectionnez une compétence pour voir les détails')
                .addOptions(
                    Object.entries(COMPETENCES).map(([name, data]) => ({
                        label: name,
                        description: data.description,
                        value: name.toLowerCase(),
                        emoji: data.emoji
                    }))
                );

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
                    const [compName, compData] = Object.entries(COMPETENCES)
                        .find(([name]) => name.toLowerCase() === selected) || [];

                    if (!compName) return;

                    const embed = new EmbedBuilder()
                        .setColor(compData.color)
                        .setTitle(`${compData.emoji} ${compName}`)
                        .setDescription(compData.description)
                        .addFields(compData.details);

                    await i.update({ 
                        embeds: [embed], 
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
            await handleError(interaction, error);
        }
    }
};