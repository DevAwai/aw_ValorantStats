const cooldowns = new Map();

function checkCooldown(userId, commandName, cooldownTime) {
    if (!cooldowns.has(commandName)) {
        cooldowns.set(commandName, new Map());
    }

    const userCooldowns = cooldowns.get(commandName);
    const now = Date.now();

    if (userCooldowns.has(userId)) {
        const lastUsed = userCooldowns.get(userId);
        if (now - lastUsed < cooldownTime) {
            const remainingTime = ((cooldownTime - (now - lastUsed)) / 1000).toFixed(1);
            return `⏳ Veuillez attendre ${remainingTime} secondes avant de réutiliser cette commande.`;
        }
    }

    userCooldowns.set(userId, now);
    return true;
}

module.exports = { checkCooldown };