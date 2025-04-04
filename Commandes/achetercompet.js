const { getUserBalance, updateUserBalance } = require('../utils/creditsManager');
const { handleError } = require('../utils/errorHandler');
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

const AVAILABLE_COMPETENCIES = {
    "Voleur": { price: 10000 },
    "Travailleur": { price: 8000 }
};

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
            choices: Object.keys(AVAILABLE_COMPETENCIES).map(comp => ({
                name: comp,
                value: comp.toLowerCase()
            }))
        }
    ],
    
    async execute(interaction) {
        try {
            const userId = interaction.user.id;
            const competenceInput = interaction.options.getString("competence").toLowerCase();
            
            const competenceEntry = Object.entries(AVAILABLE_COMPETENCIES).find(
                ([name]) => name.toLowerCase() === competenceInput
            );
            
            if (!competenceEntry) {
                return interaction.reply({ 
                    content: "❌ Cette compétence n'existe pas!", 
                    ephemeral: true 
                });
            }
            
            const [competenceName, competenceData] = competenceEntry;
            const competPrice = competenceData.price;

            if (!playerCompetencies[userId]) {
                playerCompetencies[userId] = [];
            }

            const alreadyOwned = playerCompetencies[userId].some(
                comp => comp.toLowerCase() === competenceName.toLowerCase()
            );
            
            if (alreadyOwned) {
                return interaction.reply({ 
                    content: "❌ Vous possédez déjà cette compétence!", 
                    ephemeral: true 
                });
            }

            const userBalance = getUserBalance(userId);

            if (userBalance < competPrice) {
                return interaction.reply({ 
                    content: `❌ Vous n'avez pas assez de vcoins! Il vous faut ${competPrice} vcoins.`, 
                    ephemeral: true 
                });
            }

            updateUserBalance(userId, -competPrice);
            playerCompetencies[userId].push(competenceName);
            saveCompetencies();

            await interaction.reply({ 
                content: `✅ Achat réussi! Vous avez acquis la compétence: **${competenceName}** pour **${competPrice} vcoins**.`,
                ephemeral: true
            });

        } catch (error) {
            await handleError(interaction, error, "API");
        }
    }
};