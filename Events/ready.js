const Discord = require('discord.js');
const loadSlashCommands = require('../Loaders/loadSlashCommands');
const systemchomage = require('../utils/systemchomage');
const { updateUserBalance } = require('../utils/creditsManager');
const { applyRandomTax, loadTaxData } = require('../utils/taxesManager');

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
        const taxData = loadTaxData();
        const now = new Date();
        const lastTax = new Date(taxData.lastTaxation);
        
        if (now - lastTax < 24 * 60 * 60 * 1000) {
            const nextTax = new Date(lastTax);
            nextTax.setDate(nextTax.getDate() + 1);
            const delay = nextTax - now;
            
            setTimeout(() => {
                executeDailyTax(bot);
            }, delay);
        } else {
            executeDailyTax(bot);
        }
    };

    const executeDailyTax = (bot) => {
        applyRandomTax(bot);
        console.log("💰 Taxation quotidienne effectuée");
        
        setInterval(() => {
            applyRandomTax(bot);
            console.log("💰 Taxation quotidienne effectuée");
        }, 24 * 60 * 60 * 1000);
    };

    scheduleDailyTax();
};