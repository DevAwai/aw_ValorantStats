const fs = require('fs');

module.exports = {
    name: "mescompet",
    description: "Affiche vos compétences acquises",
    cooldown: 2000,
    options: [],

    async execute(interaction) {
        const { EmbedBuilder } = require('discord.js');
        const userId = interaction.user.id;

        let playerCompetencies = {};
        try {
            playerCompetencies = JSON.parse(fs.readFileSync('./data/competencies.json', 'utf8'));
        } catch (error) {
            playerCompetencies = {};
        }

        const userCompetencies = playerCompetencies[userId] || [];

        const embed = new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle('Mes Compétences')
            .setDescription(userCompetencies.length > 0 
                ? 'Voici vos compétences acquises :'
                : 'Vous n\'avez pas encore acquis de compétences.');

        if (userCompetencies.length > 0) {
            userCompetencies.forEach(compet => {
                embed.addFields({ name: compet, value: 'Maîtrisé ✅' });
            });
        }

        await interaction.reply({ embeds: [embed] });
    }
};
