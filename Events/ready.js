const Discord = require('discord.js');
const loadSlashCommands = require('../Loaders/loadSlashCommands');
const systemchomage = require('../utils/systemchomage');
const { updateUserBalance } = require('../utils/creditsManager');
const { applyRandomTax } = require('../utils/taxesManager');

module.exports = async bot => {
    await loadSlashCommands(bot);
    console.log(`${bot.user.tag} est prêt à fonctionner!`);

    setInterval(() => {
        const guild = bot.guilds.cache.get('1283354646567456799');
        if (guild) {
            guild.members.fetch().then(members => {
                members.forEach(member => {
                    if (!member.user.bot && member.presence?.status !== 'offline') {
                        updateUserBalance(member.id, 100);
                    }
                });
            }).catch(console.error);
        }
    }, 600000);

    systemchomage(bot);

    const scheduleDailyTax = () => {
        const now = new Date();
        const targetTime = new Date();

        targetTime.setHours(19, 0, 0, 0);

        if (now > targetTime) {
            targetTime.setDate(targetTime.getDate() + 1);
        }

        const initialDelay = targetTime - now;

        setTimeout(() => {
            applyRandomTax(bot);
            console.log("💰 Taxation quotidienne effectuée à 19h");
            
            setInterval(() => {
                applyRandomTax(bot);
                console.log("💰 Taxation quotidienne effectuée à 19h");
            }, 24 * 60 * 60 * 1000);
        }, initialDelay);
    };

    scheduleDailyTax();
};