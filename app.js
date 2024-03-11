const express = require("express");
const app = express();
const path = require('path');
const mysql = require("mysql2");
const dotenv = require("dotenv");
const session = require('express-session');

dotenv.config({ path: './.env' });



//db connexion 
app.use(express.urlencoded({ extended: true }));

const db = mysql.createConnection({
    host: process.env.DATABASE_HOST,
    user: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE
});
//session
app.use(session({
    secret: 'hospital',
    resave: false,
    saveUninitialized: true,
}));


const publicDirectory = path.join(__dirname, './public');

app.use(express.static(publicDirectory));

app.use(express.json());

app.set('view engine', 'hbs');
//check db connexion
db.connect((error) => {
    if (error) {
        console.log(error)
    } else {
        console.log("mysql connected..")
    }
});





app.use('/', require('./routes/pages'));
app.use('/auth', require('./routes/auth'));
const f = require('./controllers/auth');
app.use('/auth', f.router);

//check server connexion
app.listen(3007, () => {
    console.log("server connected");
});
