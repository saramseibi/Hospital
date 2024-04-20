const mysql = require('mysql2');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const express = require('express')
const path = require('path');
const router = express.Router();
//const multer = require('multer');
//const path = require('path');


const db = mysql.createConnection({
    host: process.env.DATABASE_HOST,
    user: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE
});
// login 
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

        const token = crypto.randomBytes(16).toString('hex');
        const hashedPassword = await bcrypt.hash(password, 8);

        await db.promise().query(
            'INSERT INTO patient SET ?',
            [{ name: Username, email, cin, password: hashedPassword, gender, token: token, confirmed: false }]
        );

        await sendEmails(email, 'Confirm Your Email', token);
        res.render('Plogin', { message: 'Confirmation email sent' });
    } catch (error) {
        console.error(error);
        next(error);
    }
};

async function sendEmails(to, subject, token) {
    try {
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
            to: to,
            subject: subject,
            text: `Click the following link to confirm your email: http://localhost:3007/Plogin/${token}`,
            html: `<p>Click the following link to confirm your email:</p><p><a href="http://localhost:3007/Plogin/${token}">click here </a></p>`
        };

        let info = await transporter.sendMail(mailOptions);
        console.log(info);
    } catch (err) {
        console.log(err);
        throw err; // Rethrow or handle error appropriately
    }
}


//sign-in
const signin = async (req, res, next) => {
    try {
        console.log(req.body);
        const { Username, password } = req.body;

        let [userExists] = await db.promise().query('SELECT user_id FROM patient WHERE name = ?', [Username]);
        if (userExists.length === 0) {
            return res.render('Plogin', { message: 'No user found with that username' });
        }


        let [userResults] = await db.promise().query('SELECT user_id, name, image, password, confirmed , email  FROM patient WHERE name = ? AND confirmed = 1', [Username]);
        if (userResults.length === 0) {
            return res.render('Plogin', { message: 'Email has not been confirmed yet' });
        }

        const user = userResults[0];

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.render('Plogin', { message: 'Incorrect password' });
        } else {

            req.session.name = user.name;
            req.session.userId = user.user_id;
            req.session.image = user.image;
            req.session.email = user.email; 
            return res.redirect('/patientacount');
        }
    } catch (error) {
        console.log(error);
        next(error);
    }
};
// forget password 
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
        const token = crypto.randomBytes(16).toString('hex');
        const expires = new Date(Date.now() + 3600000);
        console.log(token);
        const updateQuery = 'UPDATE patient SET token = ? , tokenexpires = ? WHERE user_id = ?';


        try {
            db.query(updateQuery, [token, expires, user.user_id]);

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
    const token = req.body.token;
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

        return res.render('Plogin.hbs', { token, message: 'Password reset successful' });

    } catch (err) {
        console.error(err);
        return res.render('resetpassword.hbs', { token, message: 'Error updating password' });
    }

};
//search
const search = (req, res) => {
    console.log('Query parameters:', req.query);
    const name = req.query.name || '';
    const query = 'SELECT * FROM searchp WHERE LOWER(name) LIKE LOWER(?)';
    const values = [`%${name}%`];

    console.log('Executing query:', query);
    console.log('With values:', values);
    db.query(query, values, (error, results) => {
        if (error) {
            console.error(error);
            return res.status(500).send('An internal server error occurred');
        }

        if (results.length > 0) {
            return res.render('patientacount.hbs', { searchp: results });
        } else {
            return res.render('patientacount.hbs', { searchp: [], message: 'No search results found' });
        }
    });
};
// resrvation 
router.param('doctorId', (req, res, next, id) => {
    console.log(`Doctor ID is: ${id}`);
    const sql = 'SELECT * FROM doctor WHERE ID = ?';
    db.query(sql, [id], (err, results) => {
        if (err) {
            return next(err);
        }
        if (results.length > 0) {
            req.doctorId = id;
            next();
        } else {
            return next(new Error('Doctor not found'));
        }
    });
});
const reservation = async (req, res, next) => {

    const doctorId = req.params.doctorId;
    try {
        const { username, age, day, time, email } = req.body;
        
        if ( req.session.name!== username  || req.session.email !== email) {
            console.log (req.session.name);
            console.log(req.session.email);
            return res.render('reservation.hbs', {
                message: "The provided details do not match the logged-in user's information."
            });
        }
        const sql = 'SELECT name, specialization, days, join_time, logout_time FROM doctor WHERE ID = ?';


        const [doctorDetails] = await db.promise().query(sql, [doctorId]);
        console.log("Doctor details:", doctorDetails);
        const doctor = doctorDetails[0];

        const appointmentDateTime = new Date(`${day}T${time}`);
        const now = new Date();
        now.setHours(0, 0, 0, 0);

        if (appointmentDateTime < now) {
            return res.render('reservation.hbs', {
                message: "The appointment time can't have past already. Please select another day."
            });
        }

        const appointmentHour = appointmentDateTime.getHours();
        const doctorJoinHour = parseInt(doctor.join_time.split(':')[0]); 
        const doctorLogoutHour = parseInt(doctor.logout_time.split(':')[0]);
        if (appointmentHour < doctorJoinHour|| appointmentHour >= doctorLogoutHour) {
            return res.render('reservation.hbs', {
                message: 'Appointments must fall between 8 a.m. and 4 p.m. Please select another time.'
            });
        }

        const [timeSlotTaken] = await db.promise().query(
            `SELECT COUNT(*) AS count FROM appointments WHERE day = ? AND time = ? AND doctor_id = ?`,
            [day, time, doctorId] 
        );

        if (timeSlotTaken[0].count > 0) {
            return res.render('reservation.hbs', {
                message: 'This time slot has already been taken. Please select another time.'
            });
        }

        const [dailyLimitReached] = await db.promise().query(
            `SELECT COUNT(*) AS count FROM appointments WHERE day = ? AND doctor_id = ?`,
            [day, doctorId] 
        );

        if (dailyLimitReached[0].count >= 8) {
            return res.render('reservation.hbs', {
                message: 'The daily maximum of eight patients has been achieved. Please select another day.'
            });
        }

       /* const [queryResult] = await db.promise().query(
            `SELECT user_id  FROM patient WHERE name = ?`, [username]
        );

        let user_id = null;
        if (queryResult.length > 0) {
            user_id = queryResult[0].user_id;
        }else {
            return res.render('reservation.hbs', {
                message: 'Patient not found.'
            });
        }*/

        const appointmentData = {

            name: username,
            email: email,
            age: age,
            day: day,
            time: time,
            doctor_name: doctor.name, 
            doctor_id: doctorId,
            patient_id: req.session.userId,
        };


        db.query('INSERT INTO appointments SET ?', appointmentData, (error, results) => {
            if (error) {
                console.error('Database insertion error:', error);
                return res.render('reservation.hbs', {
                    message: 'An error occurred'
                });
            }
            return res.render('reservation.hbs', {
                message: 'Your appointment has been successfully booked.'
            });
        });
    } catch (error) {
        console.error('Server error:', error);
        console.error(error);
        next(error);
    }
}
/*
const reservation = async (req, res, next) => {
    try {
        const { username, age, day, time, email } = req.body;


        const appointmentDateTime = new Date(`${day}T${time}`);
        const now = new Date();
        now.setHours(0, 0, 0, 0);


        if (appointmentDateTime < now) {
            return res.render('reservation.hbs', {
                message: "The appointment time can't have past already. Please select another day."
            });
        }

        const appointmentHour = appointmentDateTime.getHours();
        if (appointmentHour < 8 || appointmentHour >= 15) {
            return res.render('reservation.hbs', {
                message: 'Appointments must fall between 8 a.m. and 4 p.m. Please select another time.'
            });
        }


        const [timeSlotTaken] = await db.promise().query(
            `SELECT COUNT(*) AS count
             FROM appointments
             WHERE day = ? AND time = ?`,
            [day, time]
        );

        if (timeSlotTaken[0].count > 0) {
            return res.render('reservation.hbs', {
                message: 'This time slot has already been taken. Please select another time.'
            });
        }


        const [dailyLimitReached] = await db.promise().query(
            `SELECT COUNT(*) AS count
             FROM appointments
             WHERE day = ?`,
            [day]
        );

        if (dailyLimitReached[0].count >= 4) {
            return res.render('reservation.hbs', {
                message: 'The daily maximum of eight patients has been achieved. Please select another day.'
            });
        }
        const [queryResult] = await db.promise().query(
            `SELECT user_id FROM patient WHERE name = ?`, [username]
        );

        let user_id = null;
        if (queryResult.length > 0) {
            user_id = queryResult[0].user_id;
        }
        const appointmentData = {
            name: username,
            email: email,
            age: age,
            day: day,
            time: time,
            doctorname: 'sam david',
            patient_id: user_id,
        };

        db.query('INSERT INTO appointments SET ?', appointmentData, (error, results) => {
            if (error) {
                return res.render('reservation.hbs', {
                    message: 'An error occurred'
                });
            }

            return res.render('reservation.hbs', {
                message: 'Your appointment has been successfully booked.'
            });

        });
    } catch (error) {
        console.error(error);
        next(error);
    }
};*/

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

router.post('/editprofile', upload.single('fileToUpload'), async (req, res) => {
    const { name, password, cpassword } = req.body;
    const user_id = req.session.userId;

    const file = req.file;
    console.log(req.file)

    if (password !== cpassword) {
        return res.render('editprofile', {
            message: "Passwords do not match."
        });
    }

    const hashedPassword = await bcrypt.hash(password, 8);

    try {
        const userProfileImagePath = path.join('/uploads', req.file.originalname);
        let filepath = file ? file.path : null;
        if (filepath) {
            await db.promise().query('UPDATE patient SET name = ?, password = ?, image = ? WHERE user_id = ?', [name, hashedPassword, userProfileImagePath, user_id]);

        }

        const [results] = await db.promise().query('SELECT name, image FROM patient WHERE user_id = ?', [user_id]);
        const { name: username, image: userProfileImage } = results[0];


        return res.render('patientacount', {
            message: "Profile updated successfully!",
            username: username,
            userProfileImagePath: userProfileImage
        });

    } catch (err) {
        console.error(err);
        return res.render('editprofile', { message: "An error occurred" });
    }

});


module.exports = { login, signin, forgetPassword, resetpassword, search, upload, reservation, router };