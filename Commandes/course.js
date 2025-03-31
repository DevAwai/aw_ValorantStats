const { SlashCommandBuilder } = require("discord.js");
const { animateRace, getAllBets } = require("../utils/raceManager");
const { isBettingOpen, setBettingOpen } = require("../utils/etatparis");

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

        if (isBettingOpen()) {
            return interaction.reply({
                content: "❌ Une course est déjà en cours ou les paris sont ouverts.",
                ephemeral: true,
            });
        }

        setBettingOpen(true); 
        await interaction.reply("🏇 La course va bientôt commencer ! Vous avez **1 minute** pour placer vos paris avec `/miserchev`.");
        await new Promise(resolve => setTimeout(resolve, 60000));

        setBettingOpen(false);

        const bets = getAllBets();
        let betSummary = "📊 **Résumé des paris :**\n";
        for (const [userId, userBets] of Object.entries(bets)) {
            const userMentions = `<@${userId}>`;
            const userBetDetails = userBets
                .map(bet => `- ${bet.mise} VCOINS sur ${bet.couleur}`)
                .join("\n");
            betSummary += `${userMentions} a parié :\n${userBetDetails}\n\n`;
        }

        await interaction.followUp(betSummary || "Aucun pari n'a été enregistré.");

        await interaction.followUp("⏳ Les paris sont maintenant fermés. La course commence !");
        const winner = await animateRace(interaction.channel);
        await interaction.followUp(`🎉 Félicitations au cheval **${winner}** pour sa victoire !`);
    },
};