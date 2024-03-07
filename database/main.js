const mongoose = require('mongoose');

async function connect(){
    try{
        await mongoose.connect(require('../config/secrets').database, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            useFindAndModify: false,
            useCreateIndex: true
        });
        console.log("Connected to the database!")
    }catch (e) {
        console.log(e)
    }
};

connect();
