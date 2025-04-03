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
                { name: 'Arabe', value: '**Prix:** 10,000 vcoins(Deviens ce que tu as voulu toujours être !)' }
            )
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    }
};
