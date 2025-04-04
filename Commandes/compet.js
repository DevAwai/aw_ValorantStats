module.exports = {
    name: "compet",
    description: "Affiche toutes les compétences disponibles à l'achat",
    cooldown: 2000,
    options: [],

    async execute(interaction) {
        const { EmbedBuilder } = require('discord.js');

        const embed = new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle('Compétences Disponibles')
            .setDescription('Voici les compétences que vous pouvez acheter:')
            .addFields(
                { name: 'Voleur', value: '**Prix:** 10,000 vcoins(1 chance sur 10 de voler entre 1 - 5000 vcoins)' },
                { name: 'Travailleur', value: '**Prix:** 8,000 vcoins(Travail sale noir)' }
            )
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    }
};
