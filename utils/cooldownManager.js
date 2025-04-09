const fs = require('fs').promises;
const path = require('path');

const cooldownPath = path.join(__dirname, '../data/cooldowns.json');
let cooldowns = {};

async function loadCooldowns() {
    try {
        const data = await fs.readFile(cooldownPath, 'utf8');
        cooldowns = JSON.parse(data);
    } catch (error) {
        if (error.code !== 'ENOENT') {
            console.error("Erreur lecture cooldowns.json:", error);
        }
    }
}

function formatDuration(ms) {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    const parts = [];
    if (hours > 0) parts.push(`${hours} heure${hours > 1 ? 's' : ''}`);
    if (minutes > 0) parts.push(`${minutes} minute${minutes > 1 ? 's' : ''}`);
    if (seconds > 0 && hours === 0) parts.push(`${seconds} seconde${seconds > 1 ? 's' : ''}`);

    return parts.join(' ') || '0 seconde';
}

async function saveCooldowns() {
    try {
        await fs.writeFile(cooldownPath, JSON.stringify(cooldowns, null, 2));
    } catch (error) {
        console.error("Erreur sauvegarde cooldowns.json:", error);
    }
}

function checkCooldown(userId, commandName, cooldownTime) {
    const key = `${commandName}-${userId}`;
    const now = Date.now();
    const lastUsed = cooldowns[key] || 0;
    const elapsed = now - lastUsed;

    if (elapsed < cooldownTime) {
        return `⌛ Vous devez attendre ${formatDuration(cooldownTime - elapsed)} avant de réutiliser cette commande.`;
    }
    return true;
}

async function setCooldown(userId, commandName) {
    const key = `${commandName}-${userId}`;
    cooldowns[key] = Date.now();
    await saveCooldowns();
}

loadCooldowns().catch(console.error);

module.exports = { 
    checkCooldown,
    setCooldown,
    formatDuration 
};