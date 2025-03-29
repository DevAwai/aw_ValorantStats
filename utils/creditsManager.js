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
    if (!credits[userId]) {
        credits[userId] = DEFAULT_BALANCE;
        saveCredits(credits);
    }
}

module.exports = {
    getUserBalance,
    updateUserBalance,
    createUserIfNotExists
};
