const { updateCredits } = require("./creditsManager");

const bets = {};
const horses = ["rouge", "bleu", "vert", "jaune"];
const horseIcons = {
    rouge: "🐴🔴",
    bleu: "🐴🔵",
    vert: "🐴🟢",
    jaune: "🐴🟡",
};

function placeBet(userId, couleur, mise) {
    const normalizedCouleur = couleur.trim().toLowerCase();
    if (!horses.includes(normalizedCouleur)) {
        return "❌ Couleur invalide. Choisissez parmi : rouge, bleu, vert, jaune.";
    }

    if (mise <= 0) {
        return "❌ La mise doit être supérieure à 0.";
    }

    if (!bets[userId]) {
        bets[userId] = [];
    }

    bets[userId].push({ couleur: normalizedCouleur, mise });
    console.log("Paris mis à jour :", bets);
    return `✅ Votre mise de ${mise} VCOINS sur le cheval ${normalizedCouleur} a été enregistrée !`;
}

function getAllBets() {
    return bets;
}

function calculateWinnings(winner) {
    const winnings = {};
    const normalizedWinner = winner.trim().toLowerCase();
    console.log("Cheval gagnant normalisé :", normalizedWinner);

    if (!horses.includes(normalizedWinner)) {
        console.error(`❌ Erreur : Le cheval gagnant "${normalizedWinner}" n'est pas valide.`);
        return winnings;
    }

    for (const [userId, userBets] of Object.entries(bets)) {
        let totalWinnings = 0;

        for (const bet of userBets) {
            const normalizedBetColor = bet.couleur.trim().toLowerCase();
            console.log(`Comparaison : pari "${normalizedBetColor}" contre gagnant "${normalizedWinner}"`);

            if (normalizedBetColor === normalizedWinner) {
                console.log(`✅ Pari gagnant trouvé : ${normalizedBetColor}`);
                totalWinnings += Math.floor(bet.mise * 1.1); 
            } else {
                console.log(`❌ Pari perdant : ${normalizedBetColor}`);
            }
        }

        if (totalWinnings > 0) {
            winnings[userId] = totalWinnings;
        }
    }

    console.log("Gains calculés :", winnings);
    return winnings;
}

async function animateRace(channel) {
    const trackLength = 10;
    const positions = { rouge: 0, bleu: 0, vert: 0, jaune: 0 };

    let raceMessage = await channel.send("🏁 La course commence ! Préparez-vous...");

    while (true) {
        for (const horse of horses) {
            positions[horse] += Math.floor(Math.random() * 3);
            if (positions[horse] >= trackLength) {
                positions[horse] = trackLength;
            }
        }

        let raceTrack = "";
        for (const horse of horses) {
            const progress = "▬".repeat(positions[horse]);
            const remaining = " ".repeat(trackLength - positions[horse]);
            raceTrack += `${horseIcons[horse]} |${progress}${remaining}|\n`;
        }

        await raceMessage.edit(`🏇 **Course en cours !**\n\n${raceTrack}`);

        const winner = horses.find(horse => positions[horse] >= trackLength);
        if (winner) {
            return winner;
        }

        await new Promise(resolve => setTimeout(resolve, 2000));
    }
}

function resetBets() {
    for (const userId in bets) {
        delete bets[userId];
    }
    console.log("✅ Les paris ont été réinitialisés.");
}

module.exports = { placeBet, animateRace, getAllBets, calculateWinnings, resetBets};