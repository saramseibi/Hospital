const express = require('express');
const router = express.Router();
const mysql = require('mysql2');
const db = mysql.createConnection({
    host: process.env.DATABASE_HOST,
    user: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE
});
router.get("/accuiel", (req, res) => {
    res.render("accuiel");
});
router.get('/Plogin/:token', async (req, res) => {
    try {
        const { token } = req.params;
        let [user] = await db.promise().query('SELECT * FROM patient WHERE token = ? AND confirmed = false', [token]);
        if (user.length > 0) {
            await db.promise().query('UPDATE patient SET confirmed = true WHERE token = ?', [token]);
            res.render('Plogin', { message: 'Email successfully confirmed!' });
        } else {
            res.status(404).render('error', { message: 'Invalid or expired token' });
        }
    } catch (error) {
        console.error('Error confirming email:', error);
        res.status(500).render('error', { message: 'Internal server error' });
    }

});
router.get("/Plogin", (req, res) => {
    res.render("Plogin.hbs");
});
router.get("/forgetpassword", (req, res) => {
    res.render("forgetpassword.hbs");
});

/*router.get("/resetpasswored", (req, res) => {
  res.render("resetpasswored.hbs"); 
}); */
router.get('/resetpassword/:token', (req, res) => {
    const token = req.params.token;

    res.render('resetpassword.hbs', { token });
});


router.get("/patientacount", (req, res, next) => {
    if (!req.session.name) {
        return res.redirect('/Plogin');
    }
    var sql = 'SELECT ID, name, specialization, days, join_time, logout_time FROM doctor';
    db.query(sql, function (error, results) {
        if (error) {
            return next(error);
        }
        function getDaysRange(daysString) {
            const weekdays = {
                '12345': 'Monday-Friday',
                '123456': 'Monday-Saturday'
            };

            return weekdays[daysString] || 'Some days are missing';
        }
        results.forEach(doctor => {
            doctor.days = getDaysRange(doctor.days);
        });

        if (results.length > 0) {

            req.session.doctorid = results[0].ID;
            req.session.doctorname = results[0].name;
            req.session.save();
            console.log(`Session Name: ${req.session.name}`);
            console.log(`Session id: ${req.session.userId}`);
            console.log(`Session image: ${req.session.image}`);
            console.log(results);
            res.render('patientacount.hbs', {
                doctor: results,
                username: req.session.name,
                userProfileImage: req.session.image
            });
        } else {
            res.render('patientacount.hbs', {
                username: req.session.name,
                userProfileImage: req.session.image
            });
        }
    });
});
router.get("/reservation/:doctorId", async (req, res, next) => {
    try {
        const doctorId = req.params.doctorId;
        let [userResults] = await db.promise().query('SELECT  name,image FROM doctor WHERE ID=? ', [doctorId]);
        const user = userResults[0];
        if (!user) {
            res.status(404).send('Doctor not found');
            return;
        }
        req.session.doctor = {
            id: doctorId,
            name: user.name,
            image: user.image
        };
        res.render("reservation.hbs", {
            doctorId: doctorId,
            doctorname: user.name,
            doctorimage: user.image
        });

    } catch (error) {
        console.log(error);
        next(error);
    }
});

router.get("/signin", (req, res) => {
    res.render("Plogin");
});

router.get("/editprofile", (req, res) => {
    res.render("editprofile.hbs", {
        username: req.session.name,
        userProfileImage: req.session.image
    });
});
router.get('/pdocument', (req, res) => {
    res.render('pdocument.hbs', {
        username: req.session.name,
        userProfileImage: req.session.image
    });
});
//doctor router
router.get("/doctorlogin", (req, res) => {
    res.render("doctorlogin.hbs");
});
router.get("/doctorsignin", (req, res) => {
    res.render("doctorlogin");
});

router.get("/doctoraccount", (req, res, next) => {
    if (!req.session.doctorname) {
        return res.redirect('/doctorlogin');
    }

    const sql = "SELECT patient_id ,name, day, time FROM appointments WHERE doctor_name = ? AND day = CURDATE()";


    db.query(sql, [req.session.doctorname], (error, results) => {
        if (error) {
            return next(error);
        }
        const formattedResults = results.map(appointment => {
            const date = new Date(appointment.day);
            const dayFormatted = date.toLocaleDateString('en-US', {
                weekday: 'short', year: 'numeric', month: 'short', day: 'numeric'
            });
            return {
                ...appointment,
                day: dayFormatted
            };
        });
        console.log(`Session Name: ${req.session.doctorname}`);
        console.log(`Session id: ${req.session.doctorid}`);
        console.log(`Session image: ${req.session.doctorimage}`);


        if (formattedResults.length > 0) {
            res.render('doctoraccount.hbs', {
                appointments: formattedResults,
                doctorname: req.session.doctorname,
                doctorProfileImage: req.session.doctorimage
            });
        } else {
            res.render('doctoraccount.hbs', {
                doctorname: req.session.doctorname,
                doctorProfileImage: req.session.doctorimage,
                message: 'No appointments for today.'
            });
        }
    });
});

router.get("/doctoreditprofile", (req, res) => {
    res.render("doctoreditprofile", {
        doctorname: req.session.doctorname,
        doctorProfileImage: req.session.doctorimage,
    });
});
router.get("/doctorforgetpassword", (req, res) => {
    res.render("doctorforgetpassword.hbs");
});
router.get('/doctorresetpassword/:token', (req, res) => {
    const token = req.params.token;

    res.render('doctorresetpassword.hbs', { token });
});
router.param('patientid', (req, res, next, patientid) => {
    console.log(`patient ID is: ${patientid}`);
    const sql = 'SELECT  * FROM appointments WHERE patient_id = ?';
    db.query(sql, [patientid], (err, results) => {

        if (err) {
            return next(err);
        }
        if (results.length > 0) {
            req.patient = patientid;
            next();
        } else {
            return next(new Error('patient not found'));
        }
    });
});
router.get('/adddocument/:patientid', async (req, res, next) => {
    try {
        const patientid = req.params.patientid;
        let [userResults] = await db.promise().query('SELECT  name FROM patient WHERE user_id=? ', [patientid]);
        const user = userResults[0];
        if (!user) {
            res.status(404).send('Doctor not found');
            return;
        }
        req.session.patient = {
            id: patientid,
            name: user.name
        };
        res.render('adddocument.hbs', {
            patientid: req.patient.id,
            doctorname: req.session.doctorname,
            doctorProfileImage: req.session.doctorimage,
        });
    } catch (error) {
        console.log(error);
        next(error);
    }
});




router.get('/document', (req, res) => {
    res.render('document.hbs', {
        doctorname: req.session.doctorname,
        doctorProfileImage: req.session.doctorimage,
    });
});


module.exports = router;