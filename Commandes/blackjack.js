const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { handleError } = require("../utils/errorHandler");
const { getUserBalance, updateUserBalance, createUserIfNotExists } = require("../utils/creditsManager");
const { checkCooldown, setCooldown, formatDuration } = require("../utils/cooldownManager");

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
    if (hideFirstCard) {
        return `[?] ${hand.slice(1).join(' ')}`;
    }
    return hand.join(' ');
}

module.exports = {
    name: "blackjack",
    description: "Jouer une partie de Blackjack (mise: 1-10 000 VCOINS)",
    cooldown: 10000,
    options: [
        {
            type: "integer",
            name: "montant",
            description: "Mise (1-10 000 VCOINS)",
            required: true,
            min_value: 1,
            max_value: 10000
        }
    ],
    async execute(interaction) {
        const cooldownResult = checkCooldown(interaction.user.id, this.name, this.cooldown);
        if (cooldownResult !== true) {
            return interaction.reply({ 
                content: `⏳ Attendez ${formatDuration(cooldownResult)} avant de rejouer.`,
                ephemeral: true 
            });
        }

        try {
            const montant = interaction.options.getInteger("montant");
            const userId = interaction.user.id;
            const userTag = interaction.user.username;

            if (montant < 1 || montant > 10000) {
                return interaction.reply({
                    content: "❌ Mise invalide (1-10 000 VCOINS seulement)",
                    ephemeral: true
                });
            }

            createUserIfNotExists(userId);
            let userBalance = getUserBalance(userId);

            if (montant > userBalance) {
                return interaction.reply({
                    content: `❌ Solde insuffisant ! Vous avez ${userBalance} VCOINS (mise min: 1, max: 10 000).`,
                    ephemeral: true
                });
            }

            setCooldown(userId, this.name, this.cooldown);

            const deck = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
            let playerHand = [];
            let dealerHand = [];
            
            for (let i = 0; i < 2; i++) {
                playerHand.push(deck[Math.floor(Math.random() * deck.length)]);
                dealerHand.push(deck[Math.floor(Math.random() * deck.length)]);
            }

            const playerTotal = calculateHand(playerHand);
            const dealerTotal = calculateHand(dealerHand);

            const initialEmbed = new EmbedBuilder()
                .setTitle("🎲 BlackJack")
                .setColor("#0099FF")
                .setDescription(`Partie commencée avec une mise de **${montant} VCOINS**`)
                .addFields(
                    { name: "Vous", value: `${formatHand(playerHand)} (Total: ${playerTotal})`, inline: false },
                    { name: "Croupier", value: formatHand(dealerHand, true), inline: false }
                )
                .setFooter({ text: "Réagissez avec ✅ pour tirer ou 🛑 pour rester" });

            const message = await interaction.reply({ 
                embeds: [initialEmbed],
                fetchReply: true 
            });

            await message.react('✅');
            await message.react('🛑'); 

            const filter = (reaction, user) => {
                return ['✅', '🛑'].includes(reaction.emoji.name) && user.id === interaction.user.id;
            };

            const collector = message.createReactionCollector({ filter, time: 30000, max: 1 });

            collector.on('collect', async (reaction) => {
                let playerBusted = false;
                let dealerBusted = false;
                let gameOver = false;
                let result = "";

                if (reaction.emoji.name === '✅') {
                    playerHand.push(deck[Math.floor(Math.random() * deck.length)]);
                    const newPlayerTotal = calculateHand(playerHand);

                    if (newPlayerTotal > 21) {
                        playerBusted = true;
                        gameOver = true;
                        result = "Loser";
                        updateUserBalance(userId, -montant);
                    }

                    if (!gameOver) {
                        const hitEmbed = new EmbedBuilder()
                            .setTitle("🎲 BlackJack")
                            .setColor("#0099FF")
                            .setDescription(`Vous avez tiré une carte. Mise: **${montant} VCOINS**`)
                            .addFields(
                                { name: "Vous", value: `${formatHand(playerHand)} (Total: ${newPlayerTotal})`, inline: false },
                                { name: "Croupier", value: formatHand(dealerHand, true), inline: false }
                            )
                            .setFooter({ text: "Réagissez avec ✅ pour tirer ou 🛑 pour rester" });

                        await message.edit({ embeds: [hitEmbed] });
                        return;
                    }
                }

                if (reaction.emoji.name === '🛑' || playerBusted) {
                    let currentDealerTotal = calculateHand(dealerHand);
                    const dealerCards = [...dealerHand];

                    while (currentDealerTotal < 17) {
                        dealerCards.push(deck[Math.floor(Math.random() * deck.length)]);
                        currentDealerTotal = calculateHand(dealerCards);
                    }

                    dealerBusted = currentDealerTotal > 21;
                    const finalPlayerTotal = calculateHand(playerHand);

                    if (playerBusted) {
                        result = "Loser";
                    } else if (dealerBusted) {
                        result = "Winner";
                    } else if (finalPlayerTotal > currentDealerTotal) {
                        result = "Winner";
                    } else if (finalPlayerTotal < currentDealerTotal) {
                        result = "Loser";
                    } else {
                        result = "Push";
                    }

                    if (result === "Winner") {
                        updateUserBalance(userId, montant);
                    } else if (result === "Loser") {
                        updateUserBalance(userId, -montant);
                    }

                    const newBalance = getUserBalance(userId);

                    const resultEmbed = new EmbedBuilder()
                        .setTitle("🎲 BlackJack")
                        .setColor(result === "Winner" ? "#00FF00" : result === "Push" ? "#FFFF00" : "#FF0000")
                        .addFields(
                            { name: "Vous", value: `${formatHand(playerHand)} (Total: ${finalPlayerTotal})`, inline: false },
                            { name: "Croupier", value: `${formatHand(dealerCards)} (Total: ${currentDealerTotal})`, inline: false }
                        );

                    if (result === "Winner") {
                        resultEmbed.setDescription(`🎉 **${userTag}** a gagné **${montant} VCOINS** !`);
                    } else if (result === "Loser") {
                        resultEmbed.setDescription(`😢 **${userTag}** a perdu **${montant} VCOINS**.`);
                    } else {
                        resultEmbed.setDescription(`🤝 Égalité ! Votre mise vous est rendue.`);
                    }

                    resultEmbed.addFields(
                        { name: "Résultat", value: result === "Winner" ? "Gagnant" : result === "Loser" ? "Perdant" : "Égalité", inline: true },
                        { name: "Nouveau solde", value: `${newBalance} VCOINS`, inline: true }
                    );

                    await message.edit({ embeds: [resultEmbed] });
                    await message.reactions.removeAll();
                }
            });

            collector.on('end', collected => {
                if (collected.size === 0) {
                    message.reply({ 
                        content: "⌛ Temps écoulé ! La partie a été annulée.",
                        ephemeral: true 
                    });
                    message.reactions.removeAll();
                }
            });

        } catch (error) {
            console.error("Erreur:", error);
            await interaction.reply({ 
                content: "❌ Échec de la partie",
                ephemeral: true 
            });
        }
    }
};