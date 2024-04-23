const mysql = require('mysql2');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const express = require('express')
const path = require('path');
const router = express.Router();
const db = mysql.createConnection({
    host: process.env.DATABASE_HOST,
    user: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE
});

/*async function hashPassword(password) {
    const saltRounds = 8; 
    try {
        const hashedPassword = await bcrypt.hash(password, saltRounds);
        console.log("Hashed Password:", hashedPassword);
    } catch (error) {
        console.error('Error hashing password:', error);
    }
}

hashPassword('100');
console.log(hashPassword);*/
const signin= async (req, res, next) => {
    try {
        //console.log(req.body);
        const { Username, password ,code } = req.body;

        let [userExists] = await db.promise().query('SELECT ID FROM doctor WHERE name = ?', [Username]);
        if (userExists.length === 0) {
            return res.render('doctorlogin', { message: 'No user found with that username' });
        }
        
        let [userResults] = await db.promise().query('SELECT ID,doctor_code, name,image, password  FROM doctor WHERE doctor_code ', [code]);
        if (userResults.length === 0) {
            return res.render('doctorlogin', { message: 'No doctor found with that code' });
        }
        
        const user = userResults[0];
        console.log('Session ', user); 
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.render('doctorlogin', { message: 'Incorrect password' });
        } else {

            req.session.doctorname = user.name;
            req.session.doctorid = user.ID;
            req.session.doctorimage = user.image
            req.session.doctoremail = user.email;
            req.session.save();
            return res.redirect('/doctoraccount');
        }
    } catch (error) {
        console.log(error);
        next(error);
    }
    
};
module.exports = { signin};
module.exports.router = router;