const fs = require('fs');
const path = require('path');

const dataPath = path.join(__dirname, 'credits.json');
const DEFAULT_BALANCE = 1000;

// Chargement des crédits depuis le fichier JSON
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

// Sauvegarde des crédits dans le fichier JSON
function saveCredits(credits) {
    try {
        fs.writeFileSync(dataPath, JSON.stringify(credits, null, 2));
    } catch (error) {
        console.error('Erreur de sauvegarde des crédits:', error);
    }
}

// Récupère le solde d'un utilisateur et le crée si besoin
function getUserBalance(userId) {
    const credits = loadCredits();
    if (!credits[userId]) {
        createUserIfNotExists(userId);
    }
    return credits[userId];
}

// Met à jour le solde d'un utilisateur
function updateUserBalance(userId, amount) {
    const credits = loadCredits();
    credits[userId] = (credits[userId] || 0) + amount;
    saveCredits(credits);
}

// Crée un utilisateur avec le solde de départ
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
