const { SlashCommandBuilder } = require("discord.js");
const { animateRace } = require("../utils/raceManager");

module.exports = {
    name: "course",
    cooldown: 2000,
    description: "Démarre une course de chevaux",
    async execute(interaction) {
        const allowedUserId = "663844641250213919";

        if (interaction.user.id !== allowedUserId) {
            return interaction.reply({
                content: "❌ Vous n'êtes pas autorisé à utiliser cette commande.",
                ephemeral: true,
            });
        }

        await interaction.reply("🏇 La course va bientôt commencer ! Vous avez **1 minute** pour placer vos paris avec `/miserchev`.");
        await new Promise(resolve => setTimeout(resolve, 60000));
        await interaction.followUp("⏳ Les paris sont maintenant fermés. La course commence !");
        const winner = await animateRace(interaction.channel);
        await interaction.followUp(`🎉 Félicitations au cheval **${winner}** pour sa victoire !`);
    },
};