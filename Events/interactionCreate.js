const { InteractionType } = require("discord.js");

module.exports = async (bot, interaction) => {
    if (interaction.type === InteractionType.ApplicationCommand) {
        try {
            let command = require(`../Commandes/${interaction.commandName}`);

            if (!command.execute) {
                return interaction.reply({ 
                    content: "❌ Cette commande ne peut pas être exécutée.", 
                    ephemeral: false // Tout le monde peut voir le message
                });
            }

            await command.execute(interaction);
        } catch (error) {
            console.error(error);
            await interaction.reply({ 
                content: "❌ Une erreur est survenue lors de l'exécution de la commande.", 
                ephemeral: false // Tout le monde voit l'erreur aussi
            });
        }
    }
};
