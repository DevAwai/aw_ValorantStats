const { updateUserBalance } = require('../utils/creditsManager');
const { scheduleDailyTax } = require('../utils/taxesManager');
const systemchomage = require('../utils/systemchomage');
const loadSlashCommands = require('../Loaders/loadSlashCommands');
const { GUILD_ID } = require('../config');
const DBD = require("discord-dashboard");
const Theme = require("dbd-soft-ui");
const config = require("../config");

module.exports = async bot => {
    await loadSlashCommands(bot);

    let allcommands = [];
    bot.commands.forEach(command => {
        allcommands.push({
            commandName: command.name,
            commandUsage: command.utilisation,
            commandDescription: command.description
        });
    });

    console.log(`${bot.user.tag} est prêt à fonctionner!`);

    await DBD.useLicense(config.license);
    DBD.Dashboard = DBD.UpdatedClass();

    const Dashboard = new DBD.Dashboard({
        port: 8080,
        client: {
            id: bot.user.id,
            secret: config.secret
        },
        redirectUri: "http://localhost:8080/discord/callback",
        domain: "http://localhost",
        minimalizedConsoleLogs: true,
        acceptPrivacyPolicy: true,
        bot: bot,
        theme: Theme({
            useTheme404: true,
            websiteName: "Dashbord ValorantStats",
            iconURL: "https://img.icons8.com/?size=100&id=1349&format=png&color=000000",
            index: {
                card: {
                    title: "ValorantStats, un robot qui a tout pour plaire",
                    description: "Ajoute le !"
                },
                information: {
                    title: "Information",
                    description: "Description"
                },
                feeds: {
                    title: "Feeds",
                    list: [
                        {
                            icon: "fa fa-user",
                            text: "New user registered",
                            timeText: "Just now",
                            bg: "bg-light-info"
                        },
                        {
                            icon: "fa fa-user",
                            text: "Server issues",
                            timeText: "3 minutes ago",
                            bg: "bg-light-danger"
                        }
                    ]
                }
            },
            commands: {
                pageTitle: "Commandes",
                table: {
                    title: "Toutes les commandes",
                    subTitle: "aa",
                    list: allcommands
                }
            }
        }),
        settings: []
    });

    Dashboard.init();

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
