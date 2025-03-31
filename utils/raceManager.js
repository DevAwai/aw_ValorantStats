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
    if (!horses.includes(couleur)) {
        return "❌ Couleur invalide. Choisissez parmi : rouge, bleu, vert, jaune.";
    }

    if (mise <= 0) {
        return "❌ La mise doit être supérieure à 0.";
    }

    if (!bets[userId]) {
        bets[userId] = [];
    }

    bets[userId].push({ couleur, mise });
    return `✅ Votre mise de ${mise} VCOINS sur le cheval ${couleur} a été enregistrée !`;
}

function getAllBets() {
    return bets;
}

function calculateWinnings(winner) {
    const winnings = {};
    for (const [userId, userBets] of Object.entries(bets)) {
        let totalWinnings = 0;
        for (const bet of userBets) {
            if (bet.couleur === winner) {
                totalWinnings += bet.mise * 1.1;
            }
        }
        if (totalWinnings > 0) {
            winnings[userId] = totalWinnings;
        }
    }
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
            await channel.send(`🎉 **Le cheval ${winner} a gagné la course !**`);
            distributeWinnings(winner);
            return winner;
        }

        await new Promise(resolve => setTimeout(resolve, 2000));
    }
}

function distributeWinnings(winner) {
    for (const [userId, userBets] of Object.entries(bets)) {
        let totalWinnings = 0;
        for (const bet of userBets) {
            if (bet.couleur === winner) {
                totalWinnings += Math.floor(bet.mise * 1.1);
            }
        }

        if (totalWinnings > 0) {
            updateCredits(userId, totalWinnings);
        }
    }

    for (const userId in bets) {
        delete bets[userId];
    }
}

module.exports = { placeBet, animateRace, getAllBets, calculateWinnings };