const Discord = require('discord.js');
const loadSlashCommands = require('../Loaders/loadSlashCommands');
const systemchomage = require('../utils/systemchomage');
const { updateUserBalance } = require('../utils/creditsManager');

module.exports = async bot => {
    await loadSlashCommands(bot);
    console.log(`${bot.user.tag} est prêt à fonctionner!`);

    setInterval(() => {
        const guild = bot.guilds.cache.get('1283354646567456799');
        if (guild) {
            guild.members.fetch().then(members => {
                members.forEach(member => {
                    if (!member.user.bot && member.presence && member.presence.status !== 'offline') {
                        updateUserBalance(member.id, 100);
                    }
                });
            }).catch(console.error);
        }
    }, 600000);

    systemchomage(bot);
};