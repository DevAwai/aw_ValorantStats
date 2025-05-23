const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { animateRace, getAllBets, calculateWinnings, resetBets } = require("../utils/raceManager");
const { isBettingOpen, setBettingOpen } = require("../utils/etatparis");
const { handleError, ERROR_TYPES } = require("../utils/errorHandler");

module.exports = {
    name: "course",
    cooldown: 2000,
    utilisation: "/course",
    description: "Démarre une course de chevaux",
    async execute(interaction) {
        try {
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

            if (Object.keys(bets).length === 0) {
                await interaction.followUp("❌ Aucune mise n'a été enregistrée. La course est annulée.");
                return;
            }

            const embed = new EmbedBuilder()
                .setTitle("📊 Résumé des paris")
                .setColor("#FFD700")
                .setDescription("Voici les paris enregistrés pour cette course :")
                .setFooter({ text: "Caisse de paris" })
                .setTimestamp();

            for (const [userId, userBets] of Object.entries(bets)) {
                const userMentions = `<@${userId}>`;
                const userBetDetails = userBets
                    .map(bet => `- ${bet.mise} VCOINS sur ${bet.couleur}`)
                    .join("\n");
                embed.addFields({ 
                    name: '\u200B', 
                    value: `${userMentions}\n${userBetDetails}`, 
                    inline: false 
                });
            }

            await interaction.followUp({ embeds: [embed] });
            await interaction.followUp("⏳ Les paris sont maintenant fermés. La course commence !");

            const winner = await animateRace(interaction.channel);
            const winnings = calculateWinnings(winner);
            const winnersEmbed = new EmbedBuilder()
                .setTitle("🎉 Résultats de la course")
                .setColor("#00FF00")
                .setDescription(`Le cheval gagnant est **${winner}** !`)
                .setFooter({ text: "Félicitations aux gagnants !" })
                .setTimestamp();

            if (Object.keys(winnings).length > 0) {
                for (const [userId, amount] of Object.entries(winnings)) {
                    winnersEmbed.addFields({
                        name: '\u200B',
                        value: `<@${userId}> a gagné **${amount} VCOINS** !`,
                        inline: false,
                    });
                }
            } else {
                winnersEmbed.setDescription(`Le cheval gagnant est **${winner}**, mais aucun pari gagnant n'a été enregistré.`);
            }

            await interaction.followUp({ embeds: [winnersEmbed] });
            resetBets();

        } catch (error) {
            console.error("Erreur dans la commande course:", error);
            await handleError(interaction, error, "API");
        
            setBettingOpen(false);
            resetBets();
        }
    },
};