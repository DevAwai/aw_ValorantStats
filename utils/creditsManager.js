const fs = require('fs');
const path = require('path');

const dataPath = path.join(__dirname, 'credits.json');
const DEFAULT_BALANCE = 1000;

function loadCredits() {
    try {
        if (!fs.existsSync(dataPath)) {
            fs.writeFileSync(dataPath, JSON.stringify({}));
        }
        const data = fs.readFileSync(dataPath);
        return JSON.parse(data);
    } catch (error) {
        console.error('Erreur de chargement des crédits:', error);
        return {};
    }
}

function saveCredits(credits) {
    try {
        fs.writeFileSync(dataPath, JSON.stringify(credits, null, 2));
    } catch (error) {
        console.error('Erreur de sauvegarde des crédits:', error);
    }
}

function getUserBalance(userId) {
    const credits = loadCredits();
    if (!(userId in credits)) { 
        createUserIfNotExists(userId);
    }
    return credits[userId]; 
}

function updateUserBalance(userId, amount) {
    const credits = loadCredits();
    credits[userId] = Math.max((credits[userId] || 0) + amount, 0);
    saveCredits(credits);
}

function createUserIfNotExists(userId) {
    const credits = loadCredits();
    if (!(userId in credits)) {
        credits[userId] = DEFAULT_BALANCE;
        saveCredits(credits);
    }
}

function dondekhaliopauvres(client) {
    const credits = loadCredits();
    const updatedUsers = [];

    console.log("Chargement des crédits :", credits);

    for (const userId in credits) {
        if (credits[userId] === 0) {
            console.log(`Utilisateur ${userId} a 0 crédits. Ajout de 100 crédits.`);
            credits[userId] += 100;
            updatedUsers.push(userId);
        }
    }

    saveCredits(credits);

    if (updatedUsers.length > 0) {
        console.log("Utilisateurs mis à jour :", updatedUsers);
        const channel = client.channels.cache.get("1322904141164445727");
        if (channel) {
            const mentions = updatedUsers.map(userId => `<@${userId}>`).join(", ");
            channel.send(`Bon les pauvres, tenez un peu de sous : ${mentions}`);
        } else {
            console.error("Le canal Discord est introuvable ou inaccessible.");
        }
    } else {
        console.log("Aucun utilisateur avec 0 crédits trouvé.");
    }
}

module.exports = {
    loadCredits,
    saveCredits,
    getUserBalance,
    updateUserBalance,
    createUserIfNotExists,
    dondekhaliopauvres
};
