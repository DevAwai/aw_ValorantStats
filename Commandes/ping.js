const Discord = require('discord.js')

module.exports = {
    name: "ping",
    description: "Affiche le ping du bot",
    permission: "Aucune",
    dm: false,

    async run(bot, message){
        await message.channel.send('Pong! Latency is ${bot.ws.ping}ms');
    }
}