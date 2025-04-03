const { getUserBalance, updateUserBalance } = require('../utils/creditsManager');
const fs = require('fs');

let playerCompetencies = {};
try {
    playerCompetencies = JSON.parse(fs.readFileSync('./data/competencies.json', 'utf8'));
} catch (error) {
    fs.writeFileSync('./data/competencies.json', JSON.stringify({}), 'utf8');
}

function saveCompetencies() {
    fs.writeFileSync('./data/competencies.json', JSON.stringify(playerCompetencies), 'utf8');
}

module.exports = {
    name: "achetercompet",
    description: "Acheter une compétence",
    cooldown: 2000,
    options: [
        {
            type: "string",
            name: "competence",
            description: "La compétence à acheter",
            required: true,
            choices: [
                { name: "Arabe", value: "Arabe" }
            ]
        }
    ],
    
    async execute(interaction) {
        const userId = interaction.user.id;
        const competence = interaction.options.getString("competence");

        if (!playerCompetencies[userId]) {
            playerCompetencies[userId] = [];
        }

        if (playerCompetencies[userId].includes(competence)) {
            return interaction.reply({ content: "Vous possédez déjà cette compétence!", ephemeral: true });
        }

        const userBalance = getUserBalance(userId);
        const competPrice = 10000;

        if (userBalance < competPrice) {
            return interaction.reply({ 
                content: `Vous n'avez pas assez de vcoins! Il vous faut ${competPrice} vcoins.`, 
                ephemeral: true 
            });
        }

        updateUserBalance(userId, -competPrice);
        playerCompetencies[userId].push(competence);
        saveCompetencies();

        await interaction.reply({ 
            content: `Achat réussi! Vous avez acquis la compétence: **${competence}** pour **${competPrice} vcoins**.`,
            ephemeral: true
        });
    }
};
