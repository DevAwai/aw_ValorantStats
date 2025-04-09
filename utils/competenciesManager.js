const fs = require('fs');
const path = require('path');

const COMPETENCIES_FILE = path.join(__dirname, '../data/competencies.json');

function loadCompetencies() {
    try {
        const data = fs.readFileSync(COMPETENCIES_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Erreur de chargement, création nouveau fichier:', error);
        const defaultData = {};
        fs.writeFileSync(COMPETENCIES_FILE, JSON.stringify(defaultData, null, 2));
        return defaultData;
    }
}

function saveCompetencies(data) {
    fs.writeFileSync(COMPETENCIES_FILE, JSON.stringify(data, null, 2));
}

module.exports = {
    loadCompetencies,
    saveCompetencies
};