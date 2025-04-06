const Discord = require("discord.js");
const config = require("./config");
const loadCommands = require("./Loaders/loadCommands");
const loadEvents = require("./Loaders/loadEvents");
const { checkForNewGames } = require("./Commandes/stats");
const fs = require("fs");
const { updateUserBalance } = require("./utils/creditsManager");
const intents = new Discord.IntentsBitField(3276799);
const bot = new Discord.Client({
    intents: [
        Discord.IntentsBitField.Flags.Guilds,
        Discord.IntentsBitField.Flags.GuildMembers,
        Discord.IntentsBitField.Flags.GuildPresences,
        Discord.IntentsBitField.Flags.MessageContent
    ]
});

bot.commands = new Discord.Collection();
bot.login(config.token);
loadCommands(bot);
loadEvents(bot);

let bonus = [];
try {
    if (!fs.existsSync("bonus.json")) {
        fs.writeFileSync("bonus.json", JSON.stringify([]));
        console.log("✅ Fichier bonus.json créé.");
    }
    const data = fs.readFileSync("bonus.json", "utf-8");
    bonus = JSON.parse(data);
} catch (error) {
    console.error("Erreur lors du chargement de bonus.json :", error);
}

function savebonus() {
    try {
        fs.writeFileSync("bonus.json", JSON.stringify(bonus, null, 2));
    } catch (error) {
        console.error("Erreur lors de la sauvegarde de bonus.json :", error);
    }
}

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

bot.on("messageCreate", async (message) => {
    if (message.channel.id === "1322904141164445727") {
        if (message.content === "Khali t'es un bon") {
            if (bonus.includes(message.author.id)) {
                try {
                    await message.delete(); 
                    console.log(`❌ ${message.author.tag} a déjà reçu le bonus.`);
                } catch (error) {
                    console.error(`❌ Impossible de supprimer le message de ${message.author.tag} :`, error);
                }
                return; 
            }
            bonus.push(message.author.id);
            savebonus(); 
            updateUserBalance(message.author.id, 1000);

            try {
                await message.delete();
                await message.author.send("Message de Khali : Bon toutou");
                console.log(`🎉 1000 VCOINS ajoutés à ${message.author.tag} et message envoyé en MP.`);
            } catch (error) {
                console.error(`❌ Impossible d'envoyer un MP à ${message.author.tag} :`, error);
            }
        }
    }
});
