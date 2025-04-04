const fs = require("fs");
const { handleError } = require("../utils/errorHandler");

module.exports = async bot => {
    try {
        const eventFiles = fs.readdirSync("./Events").filter(f => f.endsWith(".js"));
        
        for (const file of eventFiles) {
            try {
                let event = require(`../Events/${file}`);
                bot.on(file.split(".js").join(""), async (...args) => {
                    try {
                        await event(bot, ...args);
                    } catch (error) {
                        handleError(error, `Event execution: ${file}`);
                    }
                });
                console.log(`Evènement ${file} chargé avec succès !`);
            } catch (error) {
                handleError(error, `Event loading: ${file}`);
            }
        }
    } catch (error) {
        handleError(error, "Event directory reading");
    }
};