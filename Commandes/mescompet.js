const fs = require('fs');

let playerCompetencies = {};
try {
    playerCompetencies = JSON.parse(fs.readFileSync('./data/competencies.json', 'utf8'));
} catch (error) {
    fs.writeFileSync('./data/competencies.json', JSON.stringify({}), 'utf8');
}

module.exports = {
    name: "mescompet",
    description: "Affiche vos compétences acquises",
    cooldown: 2000,
    options: [],

    async execute(interaction) {
        const { EmbedBuilder } = require('discord.js');

        const userId = interaction.user.id;
        const userCompetencies = playerCompetencies[userId] || [];

        const embed = new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle('Mes Compétences')
            .setDescription(userCompetencies.length > 0 
                ? 'Voici vos compétences acquises:'
                : 'Vous n\'avez pas encore acquis de compétences.');

        if (userCompetencies.includes('Arabe')) {
            embed.addFields({ name: 'Arabe', value: 'Maîtrisé ✅' });
        }

        await interaction.reply({ embeds: [embed] });
    }
};
