const express = require('express');
const router = express.Router();
const mysql = require('mysql');
const notifier = require('node-notifier');
const port = 3000;
const app=express();
// Connexion à la base de données MySQL
const connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'pfe'
});
connection.connect();
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));
app.set('view engine', 'ejs');

app.get('/', (req, res) => {
    res.render('loginDoctor');
  });

  app.get('/forgetPassword', (req, res) => {
    res.render('forgetPassword');

  });
  app.get('/signup', (req, res) => {
    res.render('loginPatient');
  });
  app.get('/signin', (req, res) => {
    res.render('loginPatient');
  });



app.post('/signup', (req, res) => {
  const { name, email, tlfn, CIN, psw, Code, gender, birth } = req.body;
  const query = `INSERT INTO doctor (name, email, phone, cin, password, gender, birth) VALUES (?, ?, ?, ?, ?, ?, ?)`;
  connection.query(query, [name, email, tlfn, CIN, psw,  gender, birth], (error, results, fields) => {
    if (error) {
      showMessage('Failed to sign up user', res);
    } else {
      showMessage('User signed up successfully', res);
      res.redirect('/');
    }
  });
});

app.post('/signin', (req, res) => {
  const { email, psw } = req.body;
  const query = `SELECT * FROM patient WHERE email = ? AND password = ?`;
  connection.query(query, [email, psw], (error, results, fields) => {
    if (error) {
      showMessage('Failed to sign in', res);
    } else {
      if (results.length > 0) {
        showMessage('User signed in successfully', res);
        res.redirect('/');
      } else {
        showMessage('Incorrect email or password', res);
        res.redirect('/');
      }
    }
  });
});

function showMessage(message, res) {
  notifier.notify({
    title: 'Notification',
    message: message
  });
}
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

