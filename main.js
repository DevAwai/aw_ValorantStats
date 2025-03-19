const Discord = require("discord.js");
const config = require("./config");
const loadCommands = require("./Loaders/loadCommands");
const loadEvents = require("./Loaders/loadEvents");
const { checkForNewGames } = require("./Commandes/stats");

const intents = new Discord.IntentsBitField(3276799);
const bot = new Discord.Client({ intents });

bot.commands = new Discord.Collection();
bot.login(config.token);
loadCommands(bot);
loadEvents(bot);

bot.once('ready', () => {
    setInterval(() => {
        checkForNewGames(bot);
        console.log("Vérification faite !");
    }, 3600000);
});