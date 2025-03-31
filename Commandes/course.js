const { SlashCommandBuilder } = require("discord.js");
const { animateRace } = require("../utils/raceManager");

module.exports = {
    name: "course",
    cooldown: 2000,
    description: "GAGAY",
    async execute(interaction) {
        await interaction.reply("🏇 La course va bientôt commencer !");
        const winner = await animateRace(interaction.channel);
        await interaction.followUp(`🎉 Félicitations au cheval **${winner}** pour sa victoire !`);
    },
};