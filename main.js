const Discord = require("discord.js");
const config = require("./config");
const loadCommands = require("./Loaders/loadCommands");
const loadEvents = require("./Loaders/loadEvents");
const { checkForNewGames } = require("./Commandes/stats");
const fs = require("fs");

const intents = new Discord.IntentsBitField(3276799);
const bot = new Discord.Client({ intents });

bot.commands = new Discord.Collection();
bot.login(config.token);
loadCommands(bot);
loadEvents(bot);


function updateBotStatus() {
    try {
        const data = fs.readFileSync("./suivi_joueurs.json", "utf-8");
        const joueursSuivis = JSON.parse(data);
        const nombreJoueurs = Object.keys(joueursSuivis).length;

        const statusMessage = `${nombreJoueurs} joueur(s) sur Valorant`;
        bot.user.setActivity(statusMessage, { type: Discord.ActivityType.Watching });
    } catch (error) {
        console.error("Erreur lors de la mise à jour du statut du bot :", error);
    }
}


bot.once('ready', () => {
    updateBotStatus();
    setInterval(() => {
        checkForNewGames(bot);
        console.log("🔍 Vérification des parties terminée !");
    }, 60000);

    
    setInterval(() => {
        updateBotStatus();
        console.log("📢 Statut mis à jour !");
    }, 10800000);

    setInterval(() => {
        console.log("🔄 Vérification des joueurs avec 0 crédits...");
        dondekhaliopauvres(bot);
    }, 14400000);
});
