const { EmbedBuilder } = require('discord.js');
const { updateUserBalance, getUserBalance } = require('../utils/creditsManager');
const { handleError } = require('../utils/errorHandler');
const { checkCooldown } = require('../utils/cooldownManager');

module.exports = {
    name: "donvcoin",
    description: "Donne des vcoins à un autre utilisateur",
    cooldown: 2000,
    utilisation: "/donvcoin",
    options: [
        {
            type: "user",
            name: "utilisateur",
            description: "L'utilisateur à qui envoyer des vcoins",
            required: true
        },
        {
            type: "integer",
            name: "montant",
            description: "Le montant de vcoins à envoyer",
            required: true,
            min_value: 1
        }
    ],

    async execute(interaction) {
        const cooldownResult = checkCooldown(interaction.user.id, this.name, this.cooldown);
        if (cooldownResult !== true) {
            return interaction.reply({ content: cooldownResult, ephemeral: true });
        }

        try {
            const { user, options } = interaction;
            const recipient = options.getUser("utilisateur");
            const amount = options.getInteger("montant");

            if (user.id === recipient.id) {
                return interaction.reply({ 
                    content: "❌ Vous ne pouvez pas vous envoyer des vcoins à vous-même.", 
                    ephemeral: true 
                });
            }

            if (recipient.bot) {
                return interaction.reply({ 
                    content: "❌ Vous ne pouvez pas envoyer des vcoins à un bot.", 
                    ephemeral: true 
                });
            }

            const donorBalance = getUserBalance(user.id);
            if (donorBalance < amount) {
                return interaction.reply({ 
                    content: `❌ Solde insuffisant. Vous avez seulement **${donorBalance} vcoins**.`, 
                    ephemeral: true 
                });
            }

            updateUserBalance(user.id, -amount);
            updateUserBalance(recipient.id, amount);

            const embed = new EmbedBuilder()
                .setColor('#00FF00')
                .setTitle('✅ Transfert réussi')
                .setDescription(`Vous avez envoyé **${amount} vcoins** à ${recipient}`)
                .addFields(
                    { name: 'Nouveau solde', value: `${getUserBalance(user.id)} vcoins`, inline: true }
                );

            await interaction.reply({ embeds: [embed], ephemeral: true });

            try {
                const dmEmbed = new EmbedBuilder()
                    .setColor('#FFD700')
                    .setTitle('💰 Vous avez reçu un don!')
                    .setDescription(`${user} vous a envoyé **${amount} vcoins**`)
                    .setFooter({ text: 'Utilisez-les judicieusement!' });

                await recipient.send({ embeds: [dmEmbed] });
            } catch (error) {
                console.log(`Impossible d'envoyer un DM à ${recipient.username}`);
            }

        } catch (error) {
            await handleError(interaction, error, "API");
        }
    }
};