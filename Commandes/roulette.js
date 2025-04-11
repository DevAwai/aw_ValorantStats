const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } = require('discord.js');
const { getUserBalance, updateUserBalance, createUserIfNotExists } = require('../utils/creditsManager');
const { checkCooldown, setCooldown } = require('../utils/cooldownManager');

const ROULETTE_CONFIG = {
    MIN_BET: 100,
    MAX_BET: 50000,
    COOLDOWN: 10000,
    NUMBERS: [
        { number: 0, color: 'green' },
        { number: 32, color: 'red' }, { number: 15, color: 'black' }, { number: 19, color: 'red' },
        { number: 4, color: 'black' }, { number: 21, color: 'red' }, { number: 2, color: 'black' },
        { number: 25, color: 'red' }, { number: 17, color: 'black' }, { number: 34, color: 'red' },
        { number: 6, color: 'black' }, { number: 27, color: 'red' }, { number: 13, color: 'black' },
        { number: 36, color: 'red' }, { number: 11, color: 'black' }, { number: 30, color: 'red' },
        { number: 8, color: 'black' }, { number: 23, color: 'red' }, { number: 10, color: 'black' },
        { number: 5, color: 'red' }, { number: 24, color: 'black' }, { number: 16, color: 'red' },
        { number: 33, color: 'black' }, { number: 1, color: 'red' }, { number: 20, color: 'black' },
        { number: 14, color: 'red' }, { number: 31, color: 'black' }, { number: 9, color: 'red' },
        { number: 22, color: 'black' }, { number: 18, color: 'red' }, { number: 29, color: 'black' },
        { number: 7, color: 'red' }, { number: 28, color: 'black' }, { number: 12, color: 'red' },
        { number: 35, color: 'black' }, { number: 3, color: 'red' }, { number: 26, color: 'black' }
    ],
    PAYOUTS: {
        straight: 36,
        color: 2,
        dozen: 3,
        parity: 2,
        half: 2
    }
};

module.exports = {
    name: "roulette",
    description: "Jouez à la roulette casino avec différents types de paris",
    cooldown: ROULETTE_CONFIG.COOLDOWN,
    options: [{
        type: "integer",
        name: "mise",
        description: `Montant à miser (${ROULETTE_CONFIG.MIN_BET}-${ROULETTE_CONFIG.MAX_BET} VCOINS)`,
        required: true,
        min_value: ROULETTE_CONFIG.MIN_BET,
        max_value: ROULETTE_CONFIG.MAX_BET
    }],

    async execute(interaction) {
        if (!interaction.isCommand()) return;

        try {
            const userId = interaction.user.id;
            const betAmount = interaction.options.getInteger('mise');

            if (!checkCooldown(userId, this.name, this.cooldown)) {
                return interaction.reply({ 
                    ephemeral: true, 
                    content: `⏳ Vous devez attendre avant de rejouer!` 
                }).catch(console.error);
            }

            createUserIfNotExists(userId);
            const balance = getUserBalance(userId);

            if (betAmount > balance) {
                return interaction.reply({ 
                    ephemeral: true, 
                    content: `❌ Solde insuffisant! Vous avez ${balance} VCOINS` 
                }).catch(console.error);
            }

            setCooldown(userId, this.name, this.cooldown);

            const betTypeMenu = new StringSelectMenuBuilder()
                .setCustomId('roulette_bet_type')
                .setPlaceholder('Choisissez votre type de pari')
                .addOptions([
                    { label: 'Rouge/Noir', description: 'Paiement 1:1', value: 'color' },
                    { label: 'Numéro plein', description: 'Paiement 35:1', value: 'straight' },
                    { label: 'Douzaine', description: 'Paiement 2:1', value: 'dozen' }
                ]);

            const embed = new EmbedBuilder()
                .setTitle('🎰 **ROULETTE CASINO**')
                .setDescription(`💰 **Mise :** ${betAmount} VCOINS\nChoisissez votre type de pari :`)
                .setColor('#E74C3C')
                .addFields(
                    { name: 'Votre solde', value: `${balance} VCOINS`, inline: true },
                    { name: 'Mise actuelle', value: `${betAmount} VCOINS`, inline: true }
                );

            await interaction.reply({ 
                embeds: [embed], 
                components: [new ActionRowBuilder().addComponents(betTypeMenu)],
                ephemeral: false
            }).catch(console.error);
        } catch (error) {
            console.error('Erreur dans execute:', error);
            if (!interaction.replied) {
                await interaction.reply({
                    content: "❌ Une erreur est survenue lors du démarrage de la roulette",
                    ephemeral: true
                }).catch(console.error);
            }
        }
    },

    async handleBetType(interaction, betAmount) {
        if (!interaction.isStringSelectMenu()) return;

        try {
            const betType = interaction.values[0];
            
            if (betType === 'color') {
                const row = new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId('roulette_red')
                        .setLabel('ROUGE')
                        .setStyle(ButtonStyle.Danger),
                    new ButtonBuilder()
                        .setCustomId('roulette_black')
                        .setLabel('NOIR')
                        .setStyle(ButtonStyle.Secondary)
                );

                await interaction.update({
                    content: `🎰 Vous misez ${betAmount} VCOINS sur une couleur`,
                    components: [row]
                }).catch(console.error);
            } 
            else if (betType === 'straight') {
                const rows = this.createNumberButtons();
                await interaction.update({
                    content: `🎰 Vous misez ${betAmount} VCOINS sur un numéro`,
                    components: rows
                }).catch(console.error);
            }
            else if (betType === 'dozen') {
                const row = new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId('roulette_dozen_first')
                        .setLabel('1-12')
                        .setStyle(ButtonStyle.Primary),
                    new ButtonBuilder()
                        .setCustomId('roulette_dozen_second')
                        .setLabel('13-24')
                        .setStyle(ButtonStyle.Primary),
                    new ButtonBuilder()
                        .setCustomId('roulette_dozen_third')
                        .setLabel('25-36')
                        .setStyle(ButtonStyle.Primary)
                );

                await interaction.update({
                    content: `🎰 Vous misez ${betAmount} VCOINS sur une douzaine`,
                    components: [row]
                }).catch(console.error);
            }
        } catch (error) {
            console.error('Erreur dans handleBetType:', error);
            if (!interaction.replied) {
                await interaction.reply({
                    content: "❌ Erreur lors du choix du type de pari",
                    ephemeral: true
                }).catch(console.error);
            }
        }
    },

    createNumberButtons() {
        const rows = [];
        let currentRow = new ActionRowBuilder();
        
        const numbersToShow = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
        
        numbersToShow.forEach(num => {
            const btn = new ButtonBuilder()
                .setCustomId(`roulette_num_${num}`)
                .setLabel(num.toString())
                .setStyle(num === 0 ? ButtonStyle.Success : 
                        num % 2 === 1 ? ButtonStyle.Danger : ButtonStyle.Secondary);
            
            if (currentRow.components.length === 5) {
                rows.push(currentRow);
                currentRow = new ActionRowBuilder();
            }
            currentRow.addComponents(btn);
        });
        
        if (currentRow.components.length > 0) {
            rows.push(currentRow);
        }
        
        return rows;
    },

    async spinWheel(interaction, betDetails) {
        if (!interaction.isButton() && !interaction.isStringSelectMenu()) return;

        try {
            const { betType, betValue, betAmount } = betDetails;
            
            const spinEmbed = new EmbedBuilder()
                .setTitle('🎡 **La roue tourne...**')
                .setDescription('La bille roule...')
                .setColor('#3498DB');

            await interaction.deferUpdate().catch(console.error);

            await new Promise(resolve => setTimeout(resolve, 3000));

            const winner = ROULETTE_CONFIG.NUMBERS[Math.floor(Math.random() * 37)];
            const result = this.calculateResult(betType, betValue, winner);
            const payout = result.win ? betAmount * ROULETTE_CONFIG.PAYOUTS[betType] : -betAmount;

            updateUserBalance(interaction.user.id, payout);

            const resultEmbed = new EmbedBuilder()
                .setTitle(result.win ? '🎉 **VOUS GAGNEZ !**' : '💔 **Vous avez perdu...**')
                .setColor(result.win ? '#2ECC71' : '#E74C3C')
                .setDescription(`**Numéro gagnant :** ${winner.number} (${winner.color.toUpperCase()})`)
                .addFields(
                    { name: 'Votre pari', value: this.formatBet(betType, betValue), inline: true },
                    { name: 'Résultat', value: result.win ? '✅ GAGNÉ' : '❌ PERDU', inline: true },
                    { name: 'Gains', value: `${payout >= 0 ? '+' : ''}${payout} VCOINS`, inline: true },
                    { name: 'Nouveau solde', value: `${getUserBalance(interaction.user.id)} VCOINS` }
                )
                .setFooter({ text: 'Tapez /roulette pour rejouer' });

            await interaction.editReply({ 
                embeds: [resultEmbed],
                components: [] 
            }).catch(console.error);
        } catch (error) {
            console.error('Erreur dans spinWheel:', error);
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({
                    content: "❌ Erreur lors du spin de la roulette",
                    ephemeral: true
                }).catch(console.error);
            } else if (interaction.deferred) {
                await interaction.followUp({
                    content: "❌ Erreur lors du spin de la roulette",
                    ephemeral: true
                }).catch(console.error);
            }
        }
    },

    calculateResult(betType, betValue, winningNumber) {
        switch(betType) {
            case 'color':
                return { win: betValue === winningNumber.color };
            case 'straight':
                return { win: parseInt(betValue) === winningNumber.number };
            case 'dozen':
                const num = winningNumber.number;
                return {
                    win: (betValue === 'first' && num >= 1 && num <= 12) ||
                         (betValue === 'second' && num >= 13 && num <= 24) ||
                         (betValue === 'third' && num >= 25 && num <= 36)
                };
            default:
                return { win: false };
        }
    },

    formatBet(betType, betValue) {
        switch(betType) {
            case 'color': 
                return betValue === 'red' ? 'ROUGE' : 'NOIR';
            case 'straight': 
                return `Numéro ${betValue.replace('roulette_num_', '')}`;
            case 'dozen': 
                return betValue === 'first' ? '1-12' :
                       betValue === 'second' ? '13-24' : '25-36';
            default: 
                return betValue;
        }
    }
};