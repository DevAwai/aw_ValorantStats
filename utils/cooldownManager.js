const fs = require('fs');
const path = require('path');

const cooldownPath = path.join(__dirname, './cooldowns.json');
let cooldowns = {};

try {
    if (fs.existsSync(cooldownPath)) {
        cooldowns = JSON.parse(fs.readFileSync(cooldownPath, 'utf8'));
    }
} catch (error) {
    console.error("Erreur lecture cooldowns.json:", error);
}

function formatDuration(ms) {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    let parts = [];
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    if (seconds > 0 && hours === 0) parts.push(`${seconds}s`);

    return parts.join(' ') || '0s';
}

function checkCooldown(userId, commandName, cooldownTime) {
    const key = `${commandName}-${userId}`;
    const now = Date.now();
    const lastUsed = cooldowns[key] || 0;
    const remaining = cooldownTime - (now - lastUsed);

    if (remaining > 0) {
        return `⏳ Disponible dans ${formatDuration(remaining)}`;
    }

    cooldowns[key] = now;
    
    try {
        fs.writeFileSync(cooldownPath, JSON.stringify(cooldowns, null, 2));
    } catch (error) {
        console.error("Erreur sauvegarde cooldowns.json:", error);
    }

    return true;
}

module.exports = { checkCooldown };