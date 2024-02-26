const express = require('express');
const mysql = require('mysql');
const nodemailer = require('nodemailer');
const bodyParser = require('body-parser');

const app = express();
const port = 3000;

const connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'pfe'
});

const transporter = nodemailer.createTransport({
  service: 'outlook',
  auth: {
    user: 'pfe.isimg@outlook.fr',
    pass: 'pfeisimg123'
  }
});

app.use(bodyParser.urlencoded({ extended: true }));
app.get('/forgetPassword', (req, res) => {
    res.render('forgetPassword');
});

app.post('/forgetPassword', (req, res) => {
    const { email } = req.body;
    const resetLink = `http://localhost:3000/resetPassword?email=${email}`;
    const mailOptions = {
        from: 'pfe.isimg@outlook.fr',
        to: email,
        subject: 'Reset Password',
        html: `<p>You have requested to reset your password.</p>
               <p>Please click <a href="${resetLink}">here</a> to reset your password.</p>`
    };

    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.error('Error sending reset link:', error);
            res.send('Error sending reset link');
        } else {
            console.log('Email sent: ' + info.response);
            res.send('Reset link sent to your email');
        }
    });
});

// Handle MySQL connection errors
connection.connect((err) => {
  if (err) {
    console.error('Error connecting to MySQL database:', err);
    return;
  }
  console.log('Connected to MySQL database');
});
transporter.verify((error, success) => {
  if (error) {
    console.error('Error verifying email transport:', error);
  } else {
    console.log('Email transport is ready');
  }
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
