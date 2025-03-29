const fs = require('fs');
const path = require('path');

const trackedPlayersPath = path.join(__dirname, "..", "suivi_joueurs.json");

function loadTrackedPlayers() {
    if (!fs.existsSync(trackedPlayersPath)) {
        fs.writeFileSync(trackedPlayersPath, JSON.stringify([], null, 2));
    }
    return JSON.parse(fs.readFileSync(trackedPlayersPath, "utf-8"));
}

function saveTrackedPlayers(players) {
    fs.writeFileSync(trackedPlayersPath, JSON.stringify(players, null, 2));
}

module.exports = { loadTrackedPlayers, saveTrackedPlayers };