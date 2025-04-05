const { getUserBalance, updateUserBalance } = require('../utils/creditsManager');
const { handleError } = require('../utils/errorHandler');
const fs = require('fs');
const path = require('path');
const COMPETENCIES_FILE = path.join(__dirname, '../data/competencies.json');

let playerCompetencies = {};

try {
    playerCompetencies = JSON.parse(fs.readFileSync(COMPETENCIES_FILE, 'utf8'));
    console.log('Competencies loaded successfully');
} catch (error) {
    console.error('Error loading competencies:', error);
    playerCompetencies = {};
    fs.writeFileSync(COMPETENCIES_FILE, JSON.stringify({}, null, 2), 'utf8');
}

function saveCompetenciesSync() {
    try {
        fs.writeFileSync(COMPETENCIES_FILE, JSON.stringify(playerCompetencies, null, 2), 'utf8');
        console.log('Competencies saved successfully');
    } catch (error) {
        console.error('Error saving competencies:', error);
    }
}

const AVAILABLE_COMPETENCIES = {
    "Voleur": { price: 10000 },
    "Travailleur": { price: 8000 },
    "Antivol": { 
        price: 10000,
        max: 3 
    }
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

            if (competenceName === "Antivol") {
                const currentAntivol = playerCompetencies[userId]?.antivol?.count || 0;
                
                if (currentAntivol >= 3) {
                    return interaction.reply({ 
                        content: "❌ Vous avez déjà le maximum d'Antivols (3)!", 
                        ephemeral: true 
                    });
                }

                if (!playerCompetencies[userId].antivol) {
                    playerCompetencies[userId].antivol = { count: 0 };
                }

                const userBalance = getUserBalance(userId);
                if (userBalance < competPrice) {
                    return interaction.reply({ 
                        content: `❌ Vous n'avez pas assez de vcoins! Il vous faut ${competPrice} vcoins.`, 
                        ephemeral: true 
                    });
                }

                updateUserBalance(userId, -competPrice);
                playerCompetencies[userId].antivol.count++;
                playerCompetencies[userId].antivol.lastPurchase = new Date().toISOString();
                
                if (!playerCompetencies[userId].includes("Antivol")) {
                    playerCompetencies[userId].push("Antivol");
                }
                
                saveCompetenciesSync();

                return interaction.reply({ 
                    content: `✅ Achat réussi! Vous avez acquis une protection Antivol (${playerCompetencies[userId].antivol.count}/3) pour **${competPrice} vcoins**.`,
                    ephemeral: true
                });
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

            saveCompetenciesSync();

        } catch (error) {
            await handleError(interaction, error, "API");
        }
    }
};