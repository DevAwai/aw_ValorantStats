const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
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
        const userId = interaction.user.id;
        const betAmount = interaction.options.getInteger('mise');

        if (!checkCooldown(userId, this.name, this.cooldown)) {
            return interaction.reply({ 
                ephemeral: true, 
                content: `⏳ Vous devez attendre avant de rejouer!` 
            });
        }

        createUserIfNotExists(userId);
        const balance = getUserBalance(userId);

        if (betAmount > balance) {
            return interaction.reply({ 
                ephemeral: true, 
                content: `❌ Solde insuffisant! Vous avez ${balance} VCOINS` 
            });
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
        });
    },

    async handleBetType(interaction, betAmount) {
        const betType = interaction.values[0];
        let customId, components;

        switch(betType) {
            case 'color':
                customId = 'roulette_color_bet';
                components = [new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId('roulette_red')
                        .setLabel('ROUGE')
                        .setStyle(ButtonStyle.Danger),
                    new ButtonBuilder()
                        .setCustomId('roulette_black')
                        .setLabel('NOIR')
                        .setStyle(ButtonStyle.Secondary)
                )];
                break;
            case 'straight':
                customId = 'roulette_number_bet';
                components = [this.createNumberSelection()];
                break;
            case 'dozen':
                customId = 'roulette_dozen_bet';
                components = [this.createDozenSelection()];
                break;
        }

        await interaction.update({
            content: `🎰 Vous misez **${betAmount} VCOINS** sur **${this.getBetTypeName(betType)}**`,
            components: components
        });

        return customId;
    },

    createNumberSelection() {
        const numbers = Array.from({ length: 37 }, (_, i) => i);
        return new StringSelectMenuBuilder()
            .setCustomId('roulette_number')
            .setPlaceholder('Sélectionnez un numéro...')
            .addOptions(
                numbers.map(num => ({
                    label: num.toString(),
                    value: num.toString(),
                    emoji: num === 0 ? '🟢' : num % 2 === 1 ? '🔴' : '⚫'
                }))
            );
    },

    createDozenSelection() {
        return new StringSelectMenuBuilder()
            .setCustomId('roulette_dozen')
            .setPlaceholder('Choisissez une douzaine...')
            .addOptions([
                { label: '1ère douzaine (1-12)', value: 'first' },
                { label: '2ème douzaine (13-24)', value: 'second' },
                { label: '3ème douzaine (25-36)', value: 'third' }
            ]);
    },

    async spinWheel(interaction, betDetails) {
        const { betType, betValue, betAmount } = betDetails;
    
        if (!interaction.replied && !interaction.deferred) {
            await interaction.deferReply();
        }
    
        const spinEmbed = new EmbedBuilder()
            .setTitle('🎡 **La roue tourne...**')
            .setDescription('La bille roule...')
            .setColor('#3498DB');
    
        await interaction.editReply({ 
            embeds: [spinEmbed],
            components: [] 
        });
    
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
        });
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

    getBetTypeName(betType) {
        switch(betType) {
            case 'color': return 'Rouge/Noir';
            case 'straight': return 'Numéro plein';
            case 'dozen': return 'Douzaine';
            default: return betType;
        }
    },

    formatBet(betType, betValue) {
        switch(betType) {
            case 'color': return betValue === 'red' ? 'ROUGE' : 'NOIR';
            case 'straight': return `Numéro ${betValue}`;
            case 'dozen': 
                return betValue === 'first' ? '1-12' :
                       betValue === 'second' ? '13-24' : '25-36';
            default: return betValue;
        }
    }
};