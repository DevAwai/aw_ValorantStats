const Discord = require('discord.js')
const loadSlahCommands = require('../Loaders/loadSlashCommands')

module.exports = async bot =>{
    
    await loadSlahCommands(bot)

    console.log(`${bot.user.tag} est prêt à fonctionner!`)
}