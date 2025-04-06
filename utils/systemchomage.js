const Discord = require('discord.js');
const { updateUserBalance, getUserBalance } = require('../utils/creditsManager');
const fs = require('fs');
const path = require('path');

const competenciesPath = path.join(__dirname, '../data/competencies.json');

module.exports = async (bot) => {
    setInterval(async () => {
        try {
            const rawData = fs.readFileSync(competenciesPath, 'utf8');
            const playerCompetencies = JSON.parse(rawData);
            
            bot.guilds.cache.forEach(async guild => {
                try {
                    const members = await guild.members.fetch();
                    
                    members.forEach(member => {
                        if (!member.user.bot && member.presence?.status !== 'offline') {
                            const userId = member.id;
                            
                            if (playerCompetencies[userId]?.competences?.includes("Chômeur")) {
                                if (!playerCompetencies[userId]?.competences?.includes("Travailleur")) {
                                    updateUserBalance(userId, 5000);
                                    console.log(`Allocation versée à ${member.user.tag}`);
                                }
                            }
                        }
                    });
                } catch (error) {
                    console.error(`Erreur dans le guild ${guild.id}:`, error);
                }
            });
        } catch (error) {
            console.error('Erreur dans le système de chômage:', error);
        }
    }, 300000);
};