const fs = require('fs');
const path = require('path');
const { EmbedBuilder } = require('discord.js');
const { updateUserBalance, getUserBalance } = require('../utils/creditsManager');

const COMPETENCIES_FILE = path.join(__dirname, '../data/competencies.json');
const PRICES = {
    "Voleur": 5000,
    "Travailleur": 4000,
    "Antivol": 5000, 
    "Chômeur": 10000,
    "Offshore": 25000
};

module.exports = {
    name: "revendrecompet",
    description: "Revendre une compétence pour 50% de son prix",
    options: [
        {
            type: "string",
            name: "competence",
            description: "Compétence à revendre",
            required: true,
            choices: Object.keys(PRICES).map(comp => ({
                name: comp,
                value: comp.toLowerCase()
            }))
        }
    ],

    async execute(interaction) {
        try {
            const userId = interaction.user.id;
            const competenceInput = interaction.options.getString("competence").toLowerCase();

            // 1. Charger les données
            let playerCompetencies = {};
            try {
                playerCompetencies = JSON.parse(fs.readFileSync(COMPETENCIES_FILE, 'utf8'));
            } catch (error) {
                console.error("Erreur lecture fichier:", error);
                playerCompetencies = {};
            }

            // 2. Vérifier la possession
            const competenceName = Object.keys(PRICES).find(
                name => name.toLowerCase() === competenceInput
            );

            if (!competenceName) {
                return interaction.reply({
                    content: "❌ Compétence invalide",
                    ephemeral: true
                });
            }

            const userData = playerCompetencies[userId] || {
                competences: [],
                antivol: { count: 0 }
            };

            // Vérification universelle de possession
            const hasCompetence = competenceName === "Antivol" 
                ? userData.antivol.count > 0
                : userData.competences.includes(competenceName);

            if (!hasCompetence) {
                return interaction.reply({
                    content: `❌ Vous ne possédez pas "${competenceName}"`,
                    ephemeral: true
                });
            }

            // 3. Calcul du remboursement
            const refund = competenceName === "Antivol"
                ? PRICES.Antivol * userData.antivol.count
                : PRICES[competenceName];

            // 4. Suppression COMPLÈTE de la compétence
            if (competenceName === "Antivol") {
                userData.antivol.count = 0;
            }
            
            // Retrait systématique du tableau competences
            userData.competences = userData.competences.filter(c => c !== competenceName);

            // 5. Gestion des incompatibilités
            if (competenceName === "Chômeur") {
                userData.competences = userData.competences.filter(c => c !== "Travailleur");
            } else if (competenceName === "Travailleur") {
                userData.competences = userData.competences.filter(c => c !== "Chômeur");
            }

            // 6. Sauvegarde FORCÉE
            playerCompetencies[userId] = userData;
            fs.writeFileSync(COMPETENCIES_FILE, JSON.stringify(playerCompetencies, null, 2));
            fs.fsyncSync(fs.openSync(COMPETENCIES_FILE, 'r+')); // Force l'écriture physique

            // 7. Réponse
            const embed = new EmbedBuilder()
                .setColor('#4CAF50')
                .setTitle(`♻️ ${competenceName} vendue`)
                .setDescription(`+${refund} vcoins`)
                .addFields(
                    { name: 'Nouveau solde', value: `${getUserBalance(userId)} vcoins`, inline: true },
                    { name: 'Compétences restantes', value: userData.competences.join(', ') || 'Aucune' }
                );

            await interaction.reply({ embeds: [embed], ephemeral: true });

        } catch (error) {
            console.error("Erreur critique:", error);
            await interaction.reply({
                content: "❌ Erreur lors de la revente",
                ephemeral: true
            });
        }
    }
};