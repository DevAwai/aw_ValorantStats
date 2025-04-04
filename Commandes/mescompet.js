const fs = require('fs');
const path = require('path');
const cooldownManager = require('../utils/cooldownManager');

const cooldownPath = path.join(__dirname, '../data/timestamps.json');
const WORK_COOLDOWN = 2 * 60 * 60 * 1000; 
const COOLDOWN_TIME = 24 * 60 * 60 * 1000; 

module.exports = {
    name: "mescompet",
    description: "Affiche vos compétences et leur état",
    cooldown: 2000,
    options: [],

    async execute(interaction) {
        const userId = interaction.user.id;

        let playerCompetencies = {};
        try {
            playerCompetencies = JSON.parse(fs.readFileSync('./data/competencies.json', 'utf8'));
        } catch (error) {
            playerCompetencies = {};
        }

        const competences = playerCompetencies[userId] || [];
        if (competences.length === 0) {
            return interaction.reply({ content: "❌ Vous n'avez aucune compétence.", ephemeral: true });
        }

        let cooldowns = {};
        if (fs.existsSync(cooldownPath)) {
            cooldowns = JSON.parse(fs.readFileSync(cooldownPath, 'utf8'));
        }

        const now = Date.now();
        const lastUsed = cooldowns[userId] || 0;
        const isVolerReady = now - lastUsed >= COOLDOWN_TIME;

        let response = "**📜 Vos compétences :**\n";
        competences.forEach(comp => {
            const compLower = comp.toLowerCase();
            if (compLower === "voleur") {
                response += `- 🕵️‍♂️ **Voleur** : ${isVolerReady ? "✅ Utilisable" : "⏳ En chargement"}\n`;
            } else if (compLower === "travailleur") {
                const travailReady = cooldownManager.checkCooldown(userId, 'travail', WORK_COOLDOWN) === true;
                response += `- 💼 **Travailleur** : ${travailReady ? "✅ Prêt à travailler" : "⏳ En repos"}\n`;
            } else {
                response += `- ${comp} ✅\n`;
            }
        });

        await interaction.reply({ content: response, ephemeral: true });
    }
};