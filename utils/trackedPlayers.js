const fs = require('fs');
const path = require('path');

const trackedPlayersPath = path.join(__dirname, "..", "suivi_joueurs.json");

function loadTrackedPlayers() {
    if (!fs.existsSync(trackedPlayersPath)) {
        fs.writeFileSync(trackedPlayersPath, JSON.stringify([], null, 2));
    }
    const players = JSON.parse(fs.readFileSync(trackedPlayersPath, "utf-8"));
    return players.map(player => ({
        ...player,
        lastMatchesWon: player.lastMatchesWon || 0,
        lastMatchesLost: player.lastMatchesLost || 0
    }));
}

function saveTrackedPlayers(players) {
    fs.writeFileSync(trackedPlayersPath, JSON.stringify(players, null, 2));
}

module.exports = { loadTrackedPlayers, saveTrackedPlayers };