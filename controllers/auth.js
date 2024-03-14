const mysql = require('mysql2');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const express = require('express')
const router = express.Router();

const db =  mysql.createConnection({
    host: process.env.DATABASE_HOST,
    user: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE
});


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


const forgetPassword = async (req, res) => {
    const email = req.body.email;

    db.query('SELECT user_id, email FROM patient WHERE email = ?', [email], (err, results) => {
        if (err) {
            return res.render('forgetpassword', { message: 'Error accessing database' });
        }

        if (results.length === 0) {
            return res.render('forgetpassword', { message: 'Email does not exist' });
        }
        const user = results[0];
        const token = crypto.randomBytes(32).toString('hex');
        const updateQuery = 'UPDATE patient SET token = ? WHERE user_id = ?';
        try {
            db.query(updateQuery, [token, user.user_id]);

            const transporter = nodemailer.createTransport({
                service: "Gmail",
                host: "smtp.gmail.com",
                port: 465,
                secure: true,
                auth: {
                    user: process.env.EMAIL_USER,
                    pass: process.env.EMAIL_PASS
                }
            });


            const mailOptions = {
                to: user.email,
                subject: 'Password Reset Request',
                text: `Click the following link to reset your password: http://localhost:3007/resetpassword/${token}`,
                html: `<p>Click the following link to reset your password:</p><p><a href="http://localhost:3007/resetpassword/${token}">click here </a></p>`
            };

            transporter.sendMail(mailOptions, (err, info) => {
                if (err) {
                    console.log(err);
                    return res.render('forgetpassword', { message: 'Error sending email' });
                } else {
                    console.log(info);
                    return res.render('forgetpassword', { message: 'Password reset email sent' });
                }
            });
        } catch (err) {
            console.error(err);
            return res.render('forgetpassword', { message: 'Error generating token' });
        }
    });
};


//reset password 
const resetpassword = async (req, res) => {
    const token = req.body.token ;
    const password = req.body.password;
    const confirm_password = req.body.confirm_password;

    if (password !== confirm_password) {
        return res.render('resetpassword.hbs', { token, message: 'Passwords do not match' });

    }
    try {
        const hashedPassword = await bcrypt.hash(password, 8);
        console.log(hashedPassword);
        
        console.log(token);
        const updateQuery = 'UPDATE patient SET password = ? WHERE token = ?';
        db.query(updateQuery, [hashedPassword, token]);
        //await con.promise().query('UPDATE patient SET password = ? WHERE token = ?', [hashedPassword, token]);

        return res.render('resetpassword.hbs', { token, message: 'Password reset successful' });
    } catch (err) {
        console.error(err);
        return res.render('resetpassword.hbs', { token, message: 'Error updating password' });
    }

};

/*
router.get('/resetpassword/:token', (req, res) => {
    const token = req.params.token;

    res.render('resetpassword.hbs', { token });
});*/
module.exports = { login, signin, forgetPassword, resetpassword, router };