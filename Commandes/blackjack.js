const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const { getUserBalance, updateUserBalance, createUserIfNotExists } = require("../utils/creditsManager");
const { checkCooldown, setCooldown } = require("../utils/cooldownManager");

const PAYOUT_RATES = {
    BLACKJACK: 2.5,   
    WIN: 2,           
    PUSH: 1,        
    LOSE: 0           
};

function getCardValue(card) {
    if (card === 'A') return 11;
    if (['K', 'Q', 'J', '10'].includes(card)) return 10;
    return parseInt(card);
}

function calculateHand(hand) {
    let total = hand.reduce((sum, card) => sum + getCardValue(card), 0);
    let aces = hand.filter(card => card === 'A').length;
    while (total > 21 && aces > 0) {
        total -= 10;
        aces--;
    }
    return total;
}

function formatHand(hand, hideFirstCard = false) {
    if (hideFirstCard) return `[?] ${hand.slice(1).join(' ')}`;
    return hand.join(' ');
}

function isBlackjack(hand) {
    return hand.length === 2 && calculateHand(hand) === 21;
}

module.exports = {
    name: "blackjack",
    description: "Jouer une partie de Blackjack (mise: 1-10 000 VCOINS)",
    cooldown: 10000,
    utilisation: "/blackjack",
    options: [{
        type: "integer",
        name: "montant",
        description: "Mise (1-10 000 VCOINS)",
        required: true,
        min_value: 1,
        max_value: 10000
    }],
    async execute(interaction) {
        if (checkCooldown(interaction.user.id, this.name, this.cooldown) !== true) {
            return interaction.reply({ ephemeral: true, content: "⏳ Veuillez attendre avant de rejouer." });
        }

        try {
            const montant = interaction.options.getInteger("montant");
            const userId = interaction.user.id;

            createUserIfNotExists(userId);
            let userBalance = getUserBalance(userId);

            if (montant > userBalance) {
                return interaction.reply({ ephemeral: true, content: `❌ Solde insuffisant. Vous avez: ${userBalance} VCOINS` });
            }

            setCooldown(userId, this.name, this.cooldown);

            const deck = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
            let playerHand = [];
            let dealerHand = [];
            
            for (let i = 0; i < 2; i++) {
                playerHand.push(deck[Math.floor(Math.random() * deck.length)]);
                dealerHand.push(deck[Math.floor(Math.random() * deck.length)]);
            }

            const playerBJ = isBlackjack(playerHand);
            const dealerBJ = isBlackjack(dealerHand);

            if (playerBJ && dealerBJ) {
                updateUserBalance(userId, 0); 
                return endGame("Push", dealerHand, true);
            } else if (playerBJ) {
                updateUserBalance(userId, montant * 1.5); 
                return endGame("Blackjack!", dealerHand, true);
            } else if (dealerBJ) {
                updateUserBalance(userId, -montant);
                return endGame("Le croupier a fait Blackjack!", dealerHand, true);
            }

            const buttons = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('hit')
                        .setLabel('Tirer')
                        .setStyle(ButtonStyle.Primary),
                    new ButtonBuilder()
                        .setCustomId('stand')
                        .setLabel('Rester')
                        .setStyle(ButtonStyle.Danger)
                );

            const embed = new EmbedBuilder()
                .setTitle("♠️♥️ Blackjack ♦️♣️")
                .setColor("#0099FF")
                .addFields(
                    { name: "Votre main", value: `${formatHand(playerHand)} (${calculateHand(playerHand)})` },
                    { name: "Croupier", value: formatHand(dealerHand, true) },
                    { name: "Mise", value: `${montant} VCOINS` }
                );

            const response = await interaction.reply({ 
                embeds: [embed], 
                components: [buttons],
                ephemeral: true,
                fetchReply: true 
            });

            const collector = response.createMessageComponentCollector({ 
                filter: i => i.user.id === interaction.user.id,
                time: 15000
            });

            collector.on('collect', async i => {
                if (i.customId === 'hit') {
                    playerHand.push(deck[Math.floor(Math.random() * deck.length)]);
                    const newTotal = calculateHand(playerHand);

                    if (newTotal > 21) {
                        updateUserBalance(userId, -montant);
                        return endGame("Dépassé!", dealerHand);
                    }

                    embed.setFields(
                        { name: "Votre main", value: `${formatHand(playerHand)} (${newTotal})` },
                        { name: "Croupier", value: formatHand(dealerHand, true) },
                        { name: "Mise", value: `${montant} VCOINS` }
                    );

                    await i.update({ embeds: [embed] });
                } 
                else if (i.customId === 'stand') {
                    collector.stop();
                    playDealerHand();
                }
            });

            collector.on('end', () => {
                response.edit({ components: [] }).catch(() => {});
            });

            async function playDealerHand() {
                let dealerCards = [...dealerHand];
                let dealerTotal = calculateHand(dealerCards);

                while (dealerTotal < 17) {
                    dealerCards.push(deck[Math.floor(Math.random() * deck.length)]);
                    dealerTotal = calculateHand(dealerCards);
                }

                const playerTotal = calculateHand(playerHand);
                let result, payout;

                if (dealerTotal > 21) {
                    result = "Le croupier dépasse!";
                    payout = PAYOUT_RATES.WIN;
                } else if (playerTotal > dealerTotal) {
                    result = "Vous gagnez!";
                    payout = PAYOUT_RATES.WIN;
                } else if (playerTotal < dealerTotal) {
                    result = "Le croupier gagne";
                    payout = PAYOUT_RATES.LOSE;
                } else {
                    result = "Égalité";
                    payout = PAYOUT_RATES.PUSH;
                }

                const gain = Math.floor(montant * payout) - (payout === PAYOUT_RATES.PUSH ? 0 : montant);
                updateUserBalance(userId, gain);
                endGame(result, dealerCards);
            }

            async function endGame(result, finalDealerHand, showAll = false) {
                const playerTotal = calculateHand(playerHand);
                const dealerTotal = calculateHand(finalDealerHand);
                const newBalance = getUserBalance(userId);

                embed
                    .setColor(result.includes("gagne") ? "#00FF00" : result === "Égalité" ? "#FFFF00" : "#FF0000")
                    .setFields(
                        { name: "Votre main", value: `${formatHand(playerHand)} (${playerTotal})` },
                        { name: "Croupier", value: `${formatHand(finalDealerHand)} (${dealerTotal})` },
                        { name: "Résultat", value: result },
                        { name: "Nouveau solde", value: `${newBalance} VCOINS` }
                    );

                await response.edit({ 
                    embeds: [embed],
                    components: [] 
                }).catch(() => {});
            }

        } catch (error) {
            console.error("Erreur dans blackjack:", error);
            await interaction.reply({ 
                ephemeral: true, 
                content: "❌ Une erreur est survenue lors de la partie" 
            });
        }
    }
};