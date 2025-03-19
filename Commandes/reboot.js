const { MessageFlags } = require("discord.js");

module.exports = {
    name: "reboot",
    description: "Rafraîchit toutes les commandes du bot",

    async execute(interaction) {
        await interaction.reply({ content: "🔄 Rafraîchissement des commandes en cours...", ephemeral: false });

        const commandFiles = interaction.client.commands.map(command => command.name);

        for (const commandName of commandFiles) {
            try {
                delete require.cache[require.resolve(`./${commandName}.js`)];
                const command = require(`./${commandName}.js`);
                interaction.client.commands.set(command.name, command);
                console.log(`Commande ${commandName} rechargée avec succès.`);
            } catch (error) {
                console.error(`Erreur lors du rechargement de la commande ${commandName}: ${error}`);
            }
        }

        await interaction.followUp({ content: "✅ Toutes les commandes ont été rafraîchies.", ephemeral: false });
    }
};
