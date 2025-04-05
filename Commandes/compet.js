const { EmbedBuilder } = require('discord.js');
const { handleError } = require("../utils/errorHandler");

module.exports = {
    name: "compet",
    description: "Affiche toutes les compétences disponibles à l'achat",
    cooldown: 2000,
    options: [],

    async execute(interaction) {
        try {
            const embed = new EmbedBuilder()
                .setColor('#0099ff')
                .setTitle('Compétences Disponibles')
                .setDescription('Voici les compétences que vous pouvez acheter:')
                .addFields(
                    { name: 'Voleur', value: '**Prix:** 10,000 vcoins (1 chance sur 10 de voler entre 1 - 5000 vcoins)' },
                    { name: 'Travailleur', value: 'Travail sale noir' },
                    { name: 'Antivol', value: '**Prix:** 10,000 vcoins (protection contre 1 vol, max 3)'},
                )
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });

        } catch (error) {
            await handleError(interaction, error, "API");
        }
    }
};
