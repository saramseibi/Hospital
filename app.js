const express = require("express");
const path = require('path');
const dotenv = require("dotenv");
const session = require('express-session');
const { engine } = require('express-handlebars');
const app = express();
/*
const multer = require('multer');

// Multer configuration for image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/'); // Store images in the 'uploads' directory
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`); // Use timestamp and original name
  }
});
const upload = multer({ storage });
*/
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


const publicDirectory = path.join(__dirname, './public');

app.use(express.static(publicDirectory));
app.use('/uploads', express.static('public/uploads'));
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

// server connexion
app.listen(3007, () => {
    console.log("server connected");
});
