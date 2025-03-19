const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'suivi_joueurs.json');

function loadTrackedPlayers() {
    if (!fs.existsSync(filePath)) {
        return [];
    }
    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data);
}

function saveTrackedPlayers(trackedPlayers) {
    fs.writeFileSync(filePath, JSON.stringify(trackedPlayers, null, 2), 'utf8');
}

module.exports = { loadTrackedPlayers, saveTrackedPlayers };