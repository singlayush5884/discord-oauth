const express = require('express')
const app = express()
const config = require('./config/config.json')
const port = config.port || 3000
const get = require('node-fetch')
const functions = require('./functions/function')
require('./bot/index.js')
require('./database/main')

app.get('/', async (req, res) => {
    res.redirect(config.oauth_url)
})

app.get('/keep', async (req, res) => {
    res.send("Hello World")
})

app.get('/callback', async (req, res) => {

    let code = req.query.code
    if (code == undefined) return res.send(`Not a valid session. We suggest you to Retry`)

    const get_accessToken = await functions.accessToken(code)
    if (get_accessToken['error']) return res.send(`Not a valid session. We suggest you to Retry`)
    
    const accessToken = get_accessToken['access_token']

    const get_id = await functions.requestId(accessToken)
    const userId = get_id.id

    console.log(get_accessToken)

    const obj = {
        access_token: accessToken,
        refresh_token: get_accessToken['refresh_token'],
        scope: get_accessToken['scope'],
        token_type: get_accessToken['token_type'],
        user_id: userId
    }

    await functions.saveAuth(obj)

    const add_user = await functions.userJoin(accessToken, userId)
    if (add_user == false) return res.send('Not a valid session. We suggest you to Retry')

    const add_role = await functions.addRole(accessToken, userId)
    
    res.redirect("https://discord.com/oauth2/authorized")

})

app.listen(port, async () => {
    console.log(`Listening to port ${port}`)
})