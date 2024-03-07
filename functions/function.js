const get = require('node-fetch')
const secrets = require('../config/secrets')
const datab = require('../database/schema')
const delay = (ms) => new Promise((res) => setTimeout(res, ms));
const ratelimit_arr = [];

async function refreshTokens(message) {
    let database = await datab.findOne({ id: "1" });
    if (!database) database = new datab({ id: "1" });
    var permarr = database.data
    var count = 0;

    for (let i = 0; i < permarr.length; i++) {
        try {
            const array_of_members = permarr
            const refresh_token = array_of_members[i].refresh_token;

            const body = new URLSearchParams({
                client_id: secrets.client_id,
                client_secret: secret.client_secret,
                grant_type: "refresh_token",
                refresh_token: refresh_token,
                redirect_uri: secrets.redirect_uri,
                scope: "identify guilds.join"
            });

            get("https://discord.com/api/oauth2/token", {
                method: "POST",
                body: body,
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded"
                }
            }).then(async response => {
                let { status } = response;
                if (status == 401) {
                    console.log("User unauthed, Not removing, Use clean cmd")
                }
                if (status == 429) {
                    console.log("Ratelimited");
                    console.log(parseInt(response.headers.get("retry-after")));
                    await delay(parseInt(response.headers.get("retry-after")));
                }
                count++
                return await response.json().catch((err) => {
                    console.log(err)
                })
            }).then(async data => {
                await data;
                console.log(data)
                if (!data) return console.log("fuk u");
                if (data.access_token) {
                    const user_id = await requestId(data.access_token)
                    const data_obj = {
                        access_token: data.access_token,
                        refresh_token: data.refresh_token,
                        scope: data.scope,
                        token_type: data.token_type,
                        user_id,
                    }
                    await permarr.splice(i, 1);
                    await permarr.push(data_obj);
                    await datab.updateOne({
                        id: "1",
                        data: permarr
                    });
                    console.log("updated")
                }
            });
        } catch (e) {

        }
    }
    await delay(2000);
    message.channel.send({
        embeds: [{
            title: "Refreshed Tokens",
            description: `**Successfully Refreshed ${count} Tokens**`,
        }]
    });
}

async function clean(message) {
    let database = await datab.findOne({ id: "1" });
    if (!database) database = new datab({ id: "1" });
    var count = 0;
    var permarr = database.data
    const array_of_members = permarr;

    for (let i = 0; i < array_of_members.length; i++) {
        try {
            const access_token = array_of_members[i].access_token;

            this.fetch("https://discord.com/api/users/@me", {
                headers: {
                    Authorization: `Bearer ${access_token}`,
                },
            })
                .then(async (response) => {
                    await response.json().catch((err) => { });
                    let { status } = response;
                    if (status == 401) {
                        count++;
                        const index = permarr.indexOf(
                            permarr.find((x) => x.access_token === access_token)
                        );
                        permarr.splice(index, 1);
                    }
                    if (status == 429) {
                        console.log("Ratelimited");
                        console.log(parseInt(response.headers.get("retry-after")));
                        await delay(parseInt(response.headers.get("retry-after")));
                    }
                })
                .then(console.log);
        } catch (e) {

        }
    }
    await delay(10000);
    database.data = permarr
    await database.save()
    message.channel.send({
        embeds: [{
            title: "Cleaned Tokens",
            description: `**Removed ${count} Tokens**`
        }]
    });
}

async function manageJoin(obj, ratelimit) {
    let database = await datab.findOne({ id: "1" });
    if (!database) database = new datab({ id: "1" });
    var array_of_members = database.data;
    if (ratelimit === true) array_of_members = ratelimit_arr;
    var count = 0;

    for (let i = 0; i < parseInt(obj.amount); i++) {
        try {
            const response = await get(`https://discord.com/api/guilds/${obj.guild_id}/members/${array_of_members[i].user_id}`, {
                method: "PUT",
                headers: {
                    "Authorization": `Bot ${secrets.bot_token}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    "access_token": array_of_members[i].access_token
                })
            });


            const json = await response.json().catch((e) => { })
            console.log(`${response.status} - ${response.statusText}`);

            const retryAfter = parseInt(response.headers.get("retry-after"));

            if (retryAfter > 0) {
                this.ratelimit_arr.push(array_of_members[i]);

                if (response.headers.has("x-ratelimit-global")) {
                    console.log(`We've been globally ratelimited!`);

                    emit("globalratelimited", (retryAfter * 1000) + Date.now())
                }
                await delay(retryAfter);
                if (await retryJoin(array_of_members[i], obj.guild_id) === true) {
                    count++
                }
            }
            if ([201, 204].includes(response.status)) count++
        } catch (e) {

        }
    }
    await delay(2000);
    return count;
}

async function retryJoin(obj, guild_id) {
    try {
        const response = await this.fetch(`https://discord.com/api/guilds/${guild_id}/members/${obj.user_id}`, {
            method: "PUT",
            headers: {
                "Authorization": `Bot ${secrets.bot_token}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                "access_token": obj.access_token
            })
        });


        const json = await response.json().catch((e) => { })
        console.log(`${response.status} - ${response.statusText}`);
        if ([201, 204].includes(response.status)) return true
        return false;
    } catch (e) {
        return false;
    }
}

async function accessToken(code) {
    const data = new URLSearchParams({
        client_id: secrets.client_id,
        client_secret: secrets.client_secret,
        grant_type: "authorization_code",
        code: code,
        redirect_uri: secrets.redirect_uri,
        scope: "identify guilds.join",
    });
    const fetch = await get("https://discord.com/api/oauth2/token", {
        method: "POST",
        body: data,
        headers: {
            "Content-Type": "application/x-www-form-urlencoded",
        },
    });

    var result = await fetch.json();
    return result;
}

async function requestId(access_token) {
    const fetched = await get("https://discord.com/api/users/@me", {
        headers: {
            Authorization: `Bearer ${access_token}`,
        },
    });
    const json = await fetched.json();
    return json;
}

async function userJoin(access_token, userId) {
    try {
        const response = await get(`https://discord.com/api/guilds/${secrets.guild_id}/members/${userId}`, {
            method: "PUT",
            headers: {
                "Authorization": `Bot ${secrets.bot_token}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                "access_token": access_token
            })
        });


        const json = await response.json().catch((e) => { })
        console.log(`${response.status} - ${response.statusText}`);
        if ([201, 204].includes(response.status)) return true
        return false;
    } catch (e) {
        return false;
    }
}

async function addRole(access_token, userId) {
    try {
        const response = await get(`https://discord.com/api/guilds/${secrets.guild_id}/members/${userId}/roles/${secrets.verified_role}`, {
            method: "PUT",
            headers: {
                "Authorization": `Bot ${secrets.bot_token}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                "access_token": access_token
            })
        });

        const json = await response.json().catch((e) => { })
        console.log(`${response.status} - ${response.statusText}`);
        if ([204].includes(response.status)) return true
        return false;
    } catch (e) {
        return false;
    }
}

async function saveAuth(obj) {
    let database = await datab.findOne({ id: "1" });
    if (!database) database = new datab({ id: "1" });
    const existing_id = database.data.find((x) => x.user_id == obj.user_id);
    if (existing_id) {
        const index = database.data.indexOf(existing_id);
        database.data.splice(index, 1);
        database.data.push(obj);
        console.log(database.data);
        return database.save();
    } else {
        database.data.push(obj);
        database.save();
        return console.log(database.data);
    }
}

async function tokenCount() {
    let database = await datab.findOne({ id: "1" });
    if (!database) database = new datab({ id: "1" });
    return database.data.length;
}


module.exports = {
    accessToken,
    requestId,
    userJoin,
    addRole,
    saveAuth,
    tokenCount,
    manageJoin,
    clean,
    refreshTokens
}
