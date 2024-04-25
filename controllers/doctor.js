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
// edit profile 


const multer = require('multer');
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, path.join(__dirname, '..', 'public', 'uploads'));
    },
    filename: function (req, file, cb) {
        console.log(file);
        cb(null, file.originalname);

    }
});

const upload = multer({ storage: storage });

router.post('/doctoreditprofile', upload.single('fileToUpload'), async (req, res) => {
    const { name, password, cpassword } = req.body;
    const ID = req.session.doctorid;

    const file = req.file;
    console.log(req.file)

    if (password !== cpassword) {
        return res.render('doctoreditprofile', {
            message: "Passwords do not match."
        });
    }

    const hashedPassword = await bcrypt.hash(password, 8);

    try {
        const userProfileImagePath = path.join('/uploads', req.file.originalname);
        let filepath = file ? file.path : null;
        if (filepath) {
            await db.promise().query('UPDATE doctor SET name = ?, password = ?, image = ? WHERE ID = ?', [name, hashedPassword, userProfileImagePath, ID]);

        }

        const [results] = await db.promise().query('SELECT name, image FROM doctor WHERE ID = ?', [ID]);
        const { name: doctorname, image: doctorProfileImage } = results[0];


        return res.render('doctoraccount', {
            message: "Profile updated successfully!",
            doctorname: doctorname,
            doctorProfileImage: doctorProfileImage
        });

    } catch (err) {
        console.error(err);
        return res.render('doctoreditprofile', { message: "An error occurred" });
    }

});
// forget password 
const forget = async (req, res) => {
    const email = req.body.email;

    db.query('SELECT ID, email FROM doctor WHERE email = ?', [email], (err, results) => {
        if (err) {
            return res.render('doctorforgetpassword', { message: 'Error accessing database' });
        }

        if (results.length === 0) {
            return res.render('doctorforgetpassword', { message: 'Email does not exist' });
        }
        const user = results[0];
        const token = crypto.randomBytes(16).toString('hex');

        console.log(token);
        const updateQuery = 'UPDATE doctor SET token = ? WHERE ID = ?';


        try {
            db.query(updateQuery, [token,  user.ID]);

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
                text: `Click the following link to reset your password: http://localhost:3007/doctorresetpassword/${token}`,
                html: `<p>Click the following link to reset your password:</p><p><a href="http://localhost:3007/doctorresetpassword/${token}">click here </a></p>`
            };

            transporter.sendMail(mailOptions, (err, info) => {
                if (err) {
                    console.log(err);
                    return res.render('doctorforgetpassword', { message: 'Error sending email' });
                } else {
                    console.log(info);
                    return res.render('doctorforgetpassword', { message: 'Password reset email sent' });
                }
            });
        } catch (err) {
            console.error(err);
            return res.render('doctorforgetpassword', { message: 'Error generating token' });
        }
    });
};
//reset password 
const reset = async (req, res) => {
    const token = req.body.token;
    const password = req.body.password;
    const confirm_password = req.body.confirm_password;

    if (password !== confirm_password) {
        return res.render('doctorresetpassword.hbs', { token, message: 'Passwords do not match' });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 8);
        const updateQuery = 'UPDATE doctor SET password = ? WHERE token = ?';
        
        // Executing the query once with error handling
        const [result] = await db.promise().query(updateQuery, [hashedPassword, token]);

        // Check if the update was successful
        if (result.affectedRows === 0) {
            throw new Error('No user found with the provided token or password update failed.');
        }

        console.log('Password updated successfully:', hashedPassword);
        return res.render('doctorlogin.hbs', { message: 'Password reset successful' });
    } catch (err) {
        console.error('Error updating password:', err);
        return res.render('doctorresetpassword.hbs', { token, message: 'Error updating password' });
    }
};
module.exports = { signin,upload,forget,reset ,router};
