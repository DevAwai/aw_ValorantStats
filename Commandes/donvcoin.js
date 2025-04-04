const { updateUserBalance, getUserBalance } = require('../utils/creditsManager');

module.exports = {
    name: "donvcoin",
    description: "Donne des vcoins à un autre utilisateur",
    cooldown: 2000,
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
            required: true
        }
    ],

    async execute(interaction) {
        const { user, options } = interaction;
        const donorId = user.id;
        const recipient = options.getUser("utilisateur");
        const amount = options.getInteger("montant");

        if (!recipient || donorId === recipient.id) {
            return interaction.reply({ content: "❌ Vous ne pouvez pas vous envoyer des vcoins à vous-même.", ephemeral: true });
        }

        if (amount <= 0) {
            return interaction.reply({ content: "❌ Le montant doit être supérieur à 0.", ephemeral: true });
        }

        const donorBalance = getUserBalance(donorId);
        if (donorBalance < amount) {
            return interaction.reply({ content: `❌ Vous n'avez pas assez de vcoins. Solde actuel : **${donorBalance} vcoins**.`, ephemeral: true });
        }

        updateUserBalance(donorId, -amount);
        updateUserBalance(recipient.id, amount);

        await interaction.reply({ content: `✅ Vous avez envoyé **${amount} vcoins** à ${recipient.username}.`, ephemeral: true });

        try {
            await recipient.send(`💰 **${user.username}** vous a fait un don de **${amount} vcoins**, suce le 😏`);
        } catch (error) {
            console.error("Impossible d'envoyer un DM :", error);
        }
    }
};
