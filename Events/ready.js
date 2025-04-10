const { updateUserBalance } = require('../utils/creditsManager');
const { scheduleDailyTax } = require('../utils/taxesManager');
const systemchomage = require('../utils/systemchomage');
const loadSlashCommands = require('../Loaders/loadSlashCommands');
const { GUILD_ID } = require('../config');

module.exports = async bot => {
    await loadSlashCommands(bot);
    console.log(`${bot.user.tag} est prêt à fonctionner!`);

    setInterval(async () => {
        try {
            const guild = bot.guilds.cache.get(GUILD_ID);
            if (!guild) return;

            const members = await guild.members.fetch();
            members.forEach(member => {
                if (!member.user.bot && member.presence?.status !== 'offline') {
                    updateUserBalance(member.id, 100);
                }
            });
        } catch (error) {
            console.error('Error in online members credit system:', error);
        }
    }, 600000);

    systemchomage(bot);
    scheduleDailyTax(bot);
};