const express = require('express');
const mysql = require('mysql');
const bodyParser = require('body-parser');

const app = express();
const port = 3000;

// MySQL connection configuration
const connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'pfe'
});

connection.connect((err) => {
  if (err) {
    console.error('Error connecting to MySQL database:', err);
    return;
  }
  console.log('Connected to MySQL database');
});

app.use(bodyParser.urlencoded({ extended: true }));

// Route for rendering the change password form
app.get('/resetPassword', (req, res) => {
  res.render('confirmationD');
});

// Route for handling password change
app.post('/resetPassword', (req, res) => {
  const { email, password } = req.body;
  
  // Update the password in the database
  const updateQuery = `UPDATE doctor SET password = ? WHERE email = ?`;
  connection.query(updateQuery, [password, email], (error, results, fields) => {
    if (error) {
      console.error('Error updating password:', error);
      res.send('Error changing password');
    } else {
      res.send('Password changed successfully');
    }
  });
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
