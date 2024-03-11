const mysql = require("mysql2");
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const express = require('express')
const router = express.Router();
// const db = mysql.createConnection({
//     host: process.env.DATABASE_HOST,
//     user: process.env.DATABASE_USER,
//     password: process.env.DATABASE_PASSWORD,
//     database: process.env.DATABASE
// });


const login = async (req, res, next) => {
    try {

        console.log(req.body);
        const { Username, email, cin, password, gender } = req.body;


        let [emailResults] = await db.promise().query('SELECT email FROM patient WHERE email = ?', [email]);

        if (emailResults.length > 0) {
            return res.render('Plogin', { message: 'That email is already in use' });
        }
        let [cinResults] = await db.promise().query('SELECT cin FROM patient WHERE cin = ?', [cin]);

        if (cinResults.length > 0) {
            return res.render('Plogin', { message: 'That CIN is already in use' });
        }


        let hashedPassword = await bcrypt.hash(password, 8);

        console.log(hashedPassword);

        db.query('INSERT INTO patient SET ?', { name: Username, email: email, cin: cin, password: hashedPassword, gender: gender }, (error, results) => {
            if (error) {
                console.log(error);
                return res.render('Plogin', { message: 'An error occurred during registration' });
            } else {
                console.log(results);
                return res.render('Plogin', {
                    message: 'User registered successfully'
                });
            }
        });
    } catch (error) {
        console.log(error);
        next(error);
    }
};
//sign-in
const signin = async (req, res, next) => {
    try {
        console.log(req.body);
        const { Username, password } = req.body;


        let [userResults] = await db.promise().query('SELECT name , password FROM patient WHERE name = ?', [Username]);

        if (userResults.length === 0) {
            return res.render('Plogin', { message: 'No user found with that username' });
        }

        const user = userResults[0];
        //console.log(password, user.password);
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.render('Plogin', { message: 'Incorrect password' });
        } else {
            return res.render('Plogin', { message: 'User login successfully' });
        }
    } catch (error) {
        next(error);
    }
};


const forgetPassword = (req, res) => {
    const email = req.body.email;

    const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

    const transporter = nodemailer.createTransport({
        service: "Gmail",
        host: "smtp.gmail.com",
        port: 465,
        secure: true,
        auth: {
            user: 'brahmibecem@gmail.com',
            pass: 'zbtr iyft pmhv xwdr'
        }
    });


    const mailOptions = {
        to: email,
        subject: 'Password Reset Request',
        text: `Click the following link to reset your password: http://localhost:3000/resetpasswored/${token}`,
        html: `<p>Click the following link to reset your password:</p><p><a href="http://localhost:3000/resetpasswored/${token}">http://localhost:3000/resetpasswored/${token}</a></p>`
    };

    transporter.sendMail(mailOptions, (err, info) => {
        if (err) {
            console.log(err);
            res.send('Error sending email');
        } else {
            console.log(info);
            res.send('Password reset email sent');
        }
    });
};

router.get('/resetpasswored/:token', (req, res) => {
    const token = req.params.token;

    res.render('resetpasswored.hbs', { token });
});


router.post('/resetpasswored/:token', (req, res) => {
    const token = req.params.token;
    const password = req.body.password;
    const confirm_password = req.body.confirm_password;

    if (password !== confirm_password) {
        res.render('resetpasswored.hbs', { token, message: 'Passwords do not match' });
        return;
    }

    res.send('Password reset successful');
});


module.exports = { login, signin, forgetPassword, router };