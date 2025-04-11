const { getUserBalance, updateUserBalance } = require('../utils/creditsManager');
const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: "roulette",
    description: "Pariez sur rouge, noir ou vert pour tenter de gagner des vcoins!",
    cooldown: 2000,
    options: [
        {
            type: "string",
            name: "couleur",
            description: "Choisissez une couleur",
            required: true,
            choices: [
                { name: "Rouge", value: "rouge" },
                { name: "Noir", value: "noir" },
                { name: "Vert", value: "vert" }
            ]
        },
        {
            type: "integer",
            name: "montant",
            description: "Montant de vcoins à miser",
            required: true
        }
    ],

    async execute(interaction) {
        const userId = interaction.user.id;
        const couleur = interaction.options.getString('couleur');
        const montant = interaction.options.getInteger('montant');
        const balance = getUserBalance(userId);

        if (montant <= 0) {
            return interaction.reply({ content: '❌ Montant invalide.', ephemeral: true });
        }

        if (balance < montant) {
            return interaction.reply({ content: `❌ Vous n'avez pas assez de vcoins (balance: ${balance})`, ephemeral: true });
        }

        const couleurs = {
            vert: { value: 0, multiplier: 14, emoji: '🟩' },
            rouge: { value: 1, multiplier: 2, emoji: '🟥' },
            noir: { value: 2, multiplier: 2, emoji: '⬛' },
        };

        const numero = Math.floor(Math.random() * 37);
        let couleurGagnante = numero === 0 ? 'vert' : numero % 2 === 0 ? 'noir' : 'rouge';

        const animationFrames = [
            '🎯 | 🔴 ⚫ 🟩',
            '🎯 | ⚫ 🟩 🔴',
            '🎯 | 🟩 🔴 ⚫',
            '🎯 | 🔴 ⚫ 🟩',
            '🎯 | ⚫ 🟩 🔴',
            '🎯 | 🟩 🔴 ⚫',
            '🎯 | 🎉 Résultat imminent...'
        ];

        const embedInitial = new EmbedBuilder()
            .setTitle('🎰 Roulette en cours...')
            .setDescription(`Vous misez **${montant} vcoins** sur ${couleurs[couleur].emoji} **${couleur.toUpperCase()}**.\n\n🔄 Lancement de la roue...`)
            .setColor('#2f3136');

        await interaction.reply({ embeds: [embedInitial], ephemeral: true });

        for (let i = 0; i < animationFrames.length; i++) {
            await new Promise(resolve => setTimeout(resolve, 500));
            const embedSpin = EmbedBuilder.from(embedInitial)
                .setDescription(`Vous misez **${montant} vcoins** sur ${couleurs[couleur].emoji} **${couleur.toUpperCase()}**.\n\n${animationFrames[i]}`);
            await interaction.editReply({ embeds: [embedSpin] });
        }

        await new Promise(resolve => setTimeout(resolve, 1000));

        const embedResult = new EmbedBuilder()
            .setTitle('🎰 Résultat de la roulette')
            .addFields(
                { name: 'Numéro tiré', value: `${numero}`, inline: true },
                { name: 'Couleur gagnante', value: `${couleurs[couleurGagnante].emoji} ${couleurGagnante.toUpperCase()}`, inline: true }
            )
            .setColor(couleurGagnante === 'rouge' ? 'Red' : couleurGagnante === 'noir' ? 'DarkGrey' : 'Green');

        if (couleur === couleurGagnante) {
            const gain = montant * couleurs[couleur].multiplier;
            updateUserBalance(userId, gain);
            embedResult.setDescription(`✅ Bravo ! Vous avez gagné **${gain} vcoins** !`);
        } else {
            updateUserBalance(userId, -montant);
            embedResult.setDescription(`❌ Perdu ! Vous perdez **${montant} vcoins**.`);
        }

        await interaction.editReply({ embeds: [embedResult] });
    }
};
