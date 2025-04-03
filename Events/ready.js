const Discord = require('discord.js');
const loadSlashCommands = require('../Loaders/loadSlashCommands');
const { updateUserBalance } = require('../utils/creditsManager');

module.exports = async bot => {
    await loadSlashCommands(bot);
    console.log(`${bot.user.tag} est prêt à fonctionner!`);

    setInterval(() => {
        const guild = bot.guilds.cache.get('1283354646567456799');
        if (guild) {
            guild.members.cache.forEach(member => {
                if (!member.user.bot && member.presence?.status !== 'offline') {
                    updateUserBalance(member.id, 100);
                }
            });
        }
    }, 600000);
};