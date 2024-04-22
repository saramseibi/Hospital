const express = require("express");
const path = require('path');
const dotenv = require("dotenv");
const session = require('express-session');
const { engine } = require('express-handlebars');
const bodyParser = require('body-parser');
const app = express();

dotenv.config({ path: './.env' });
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

/*
const db = mysql.createConnection({
    host: process.env.DATABASE_HOST,
    user: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE
});*/
//session
app.use(session({
    secret: 'hospital',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false } 
}));

app.use(bodyParser.urlencoded({ extended: true }));

const publicDirectory = path.join(__dirname, './public');

app.use(express.static(publicDirectory));

app.use(express.static('public'));

app.use(express.json());
app.engine('handlebars', engine());
app.set('view engine', 'hbs');


//check db connexion
/*
db.connect((error) => {
    if (error) {
        console.log(error)
    } else {
        console.log("mysql connected..")
    }
});
*/



//logout
app.post('/logout', (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        console.error(err);
        res.status(500).send('Logout error');
      } else {
        res.clearCookie('session_id'); 
        res.redirect('/accuiel'); 
      }
    });
  });
app.use('/', require('./routes/pages'));
app.use('/auth', require('./routes/auth'));
const f = require('./controllers/auth');
app.use('/auth', f.router);
const doctorRoutes = require('./controllers/doctor').router;
app.use('/doctor', doctorRoutes);
console.log(f.router);
console.log(doctorRoutes);
// server connexion
app.listen(3007, () => {
    console.log("server connected");
});
