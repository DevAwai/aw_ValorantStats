const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const { getUserBalance, updateUserBalance, createUserIfNotExists } = require("../utils/creditsManager");
const { checkCooldown, setCooldown } = require("../utils/cooldownManager");

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

module.exports = {
    name: "blackjack",
    description: "Jouer une partie de Blackjack (mise: 1-10 000 VCOINS)",
    cooldown: 10000,
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
            return interaction.reply({ ephemeral: true, content: "" });
        }

        try {
            const montant = interaction.options.getInteger("montant");
            const userId = interaction.user.id;

            createUserIfNotExists(userId);
            let userBalance = getUserBalance(userId);

            if (montant > userBalance) {
                return interaction.reply({ ephemeral: true, content: "" });
            }

            setCooldown(userId, this.name, this.cooldown);

            const deck = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
            let playerHand = [];
            let dealerHand = [];
            
            for (let i = 0; i < 2; i++) {
                playerHand.push(deck[Math.floor(Math.random() * deck.length)]);
                dealerHand.push(deck[Math.floor(Math.random() * deck.length)]);
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
                .setTitle("BlackJack")
                .setColor("#0099FF")
                .addFields(
                    { name: "Vous", value: `${formatHand(playerHand)} (${calculateHand(playerHand)})` },
                    { name: "Croupier", value: formatHand(dealerHand, true) }
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
                        return endGame("Loser", calculateHand(dealerHand));
                    }

                    embed.setFields(
                        { name: "Vous", value: `${formatHand(playerHand)} (${newTotal})` },
                        { name: "Croupier", value: formatHand(dealerHand, true) }
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
                let result;

                if (playerTotal > 21) result = "Loser";
                else if (dealerTotal > 21) result = "Winner";
                else if (playerTotal > dealerTotal) result = "Winner";
                else if (playerTotal < dealerTotal) result = "Loser";
                else result = "Push";

                endGame(result, dealerTotal);
            }

            async function endGame(result, dealerTotal) {
                if (result === "Winner") updateUserBalance(userId, montant);
                else if (result === "Loser") updateUserBalance(userId, -montant);

                embed
                    .setColor(result === "Winner" ? "#00FF00" : result === "Push" ? "#FFFF00" : "#FF0000")
                    .setFields(
                        { name: "Vous", value: `${formatHand(playerHand)} (${calculateHand(playerHand)})` },
                        { name: "Croupier", value: `${formatHand(dealerHand)} (${dealerTotal})` },
                        { name: "Résultat", value: result === "Winner" ? `+${montant} VCOINS` : result === "Loser" ? `-${montant} VCOINS` : "Égalité" },
                        { name: "Solde", value: `${getUserBalance(userId)} VCOINS` }
                    );

                await response.edit({ 
                    embeds: [embed],
                    components: [] 
                }).catch(() => {});
            }

        } catch {
            interaction.reply({ ephemeral: true, content: "" }).catch(() => {});
        }
    }
};