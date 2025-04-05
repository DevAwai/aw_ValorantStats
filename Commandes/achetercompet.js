const { getUserBalance, updateUserBalance } = require('../utils/creditsManager');
const { handleError } = require('../utils/errorHandler');
const fs = require('fs');
const path = require('path');
const COMPETENCIES_FILE = path.join(__dirname, '../data/competencies.json');

let playerCompetencies = {};
try {
    const data = fs.readFileSync(COMPETENCIES_FILE, 'utf8');
    playerCompetencies = JSON.parse(data);
    console.log('Compétences chargées avec succès');
} catch (error) {
    console.error('Erreur de chargement, création nouveau fichier:', error);
    playerCompetencies = {};
    fs.writeFileSync(COMPETENCIES_FILE, JSON.stringify({}, null, 2));
}

function saveCompetencies() {
    fs.writeFileSync(COMPETENCIES_FILE, JSON.stringify(playerCompetencies, null, 2));
    console.log('Compétences sauvegardées');
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
                playerCompetencies[userId] = {
                    competences: [],
                    antivol: { count: 0 }
                };
            } else {
                if (!playerCompetencies[userId].competences) {
                    playerCompetencies[userId].competences = [];
                }
                if (!playerCompetencies[userId].antivol) {
                    playerCompetencies[userId].antivol = { count: 0 };
                }
            }

            if (competenceName === "Antivol") {
                if (playerCompetencies[userId].antivol.count >= 3) {
                    return interaction.reply({ 
                        content: "❌ Vous avez déjà le maximum d'Antivols (3)!", 
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
                playerCompetencies[userId].antivol.count++;
                
                if (!playerCompetencies[userId].competences.includes("Antivol")) {
                    playerCompetencies[userId].competences.push("Antivol");
                }

                saveCompetencies();
                return interaction.reply({ 
                    content: `✅ Achat réussi! Antivol (${playerCompetencies[userId].antivol.count}/3) pour ${competPrice} vcoins.`,
                    ephemeral: true
                });
            }

            if (playerCompetencies[userId].competences.includes(competenceName)) {
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
            playerCompetencies[userId].competences.push(competenceName);
            saveCompetencies();

            await interaction.reply({ 
                content: `✅ Achat réussi! Vous avez acquis la compétence: **${competenceName}** pour **${competPrice} vcoins**.`,
                ephemeral: true
            });

        } catch (error) {
            console.error("Erreur dans achetercompet:", error);
            await interaction.reply({
                content: "❌ Une erreur est survenue lors de l'achat",
                ephemeral: true
            });
        }
    }
};