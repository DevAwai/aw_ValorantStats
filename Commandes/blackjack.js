const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
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
                    content: `❌ Solde insuffisant ! Vous avez ${userBalance} VCOINS.`,
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

            const buttons = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('hit')
                        .setLabel('Tirer (✅)')
                        .setStyle(ButtonStyle.Primary),
                    new ButtonBuilder()
                        .setCustomId('stand')
                        .setLabel('Rester (🛑)')
                        .setStyle(ButtonStyle.Danger)
                );

            const embed = new EmbedBuilder()
                .setTitle("🎲 BlackJack")
                .setColor("#0099FF")
                .setDescription(`Mise: **${montant} VCOINS**`)
                .addFields(
                    { name: "Votre main", value: `${formatHand(playerHand)} (Total: ${calculateHand(playerHand)})` },
                    { name: "Croupier", value: formatHand(dealerHand, true) }
                )
                .setFooter({ text: "Vous avez 15 secondes pour jouer" });

            const response = await interaction.reply({ 
                embeds: [embed], 
                components: [buttons],
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
                        return endGame("Loser", "Vous avez dépassé 21 !");
                    }

                    embed.setFields(
                        { name: "Votre main", value: `${formatHand(playerHand)} (Total: ${newTotal})` },
                        { name: "Croupier", value: formatHand(dealerHand, true) }
                    );

                    await i.update({ embeds: [embed], components: [buttons] });
                } 
                else if (i.customId === 'stand') {
                    collector.stop();
                    playDealerHand();
                }
            });

            collector.on('end', async () => {
                if (!collector.ended) {
                    await interaction.followUp({ 
                        content: "⌛ Temps écoulé ! Partie annulée.",
                        ephemeral: true 
                    });
                    await response.edit({ components: [] }).catch(console.error);
                }
            });

            async function playDealerHand() {
                let dealerCards = [...dealerHand];
                let dealerTotal = calculateHand(dealerCards);

                while (dealerTotal < 17) {
                    dealerCards.push(deck[Math.floor(Math.random() * deck.length)]);
                    dealerTotal = calculateHand(dealerCards);
                }

                const playerTotal = calculateHand(playerHand);
                let result, description;

                if (playerTotal > 21) {
                    result = "Loser";
                    description = "Vous avez dépassé 21 !";
                } 
                else if (dealerTotal > 21) {
                    result = "Winner";
                    description = "Le croupier a dépassé 21 !";
                } 
                else if (playerTotal > dealerTotal) {
                    result = "Winner";
                    description = "Vous avez battu le croupier !";
                } 
                else if (playerTotal < dealerTotal) {
                    result = "Loser";
                    description = "Le croupier vous a battu !";
                } 
                else {
                    result = "Push";
                    description = "Égalité !";
                }

                endGame(result, description);
            }

            async function endGame(result, description) {
                if (result === "Winner") {
                    updateUserBalance(userId, montant);
                } else if (result === "Loser") {
                    updateUserBalance(userId, -montant);
                }

                const disabledButtons = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId('hit')
                            .setLabel('Tirer')
                            .setStyle(ButtonStyle.Primary)
                            .setDisabled(true),
                        new ButtonBuilder()
                            .setCustomId('stand')
                            .setLabel('Rester')
                            .setStyle(ButtonStyle.Danger)
                            .setDisabled(true)
                    );

                embed
                    .setColor(result === "Winner" ? "#00FF00" : result === "Push" ? "#FFFF00" : "#FF0000")
                    .setDescription(`${description}\nMise: **${montant} VCOINS**`)
                    .setFields(
                        { name: "Votre main", value: `${formatHand(playerHand)} (Total: ${calculateHand(playerHand)})` },
                        { name: "Croupier", value: `${formatHand(dealerHand)} (Total: ${calculateHand(dealerHand)})` },
                        { name: "Résultat", value: result === "Winner" ? `🎉 Gagné ${montant} VCOINS` : result === "Loser" ? `😢 Perdu ${montant} VCOINS` : "🤝 Égalité" },
                        { name: "Nouveau solde", value: `${getUserBalance(userId)} VCOINS` }
                    )
                    .setFooter({ text: "Partie terminée" });

                await response.edit({ 
                    embeds: [embed], 
                    components: [disabledButtons] 
                }).catch(console.error);
            }

        } catch (error) {
            console.error("Erreur Blackjack:", error);
            await interaction.reply({ 
                content: "❌ Une erreur est survenue lors de la partie.",
                ephemeral: true 
            }).catch(console.error);
        }
    }
};