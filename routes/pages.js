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
router.get("/patientacount", (req, res) => {
    if (!req.session.name) {
        return res.redirect('/Plogin');
    }
    var sql = 'SELECT ID, name, specialization ,days ,join_time,logout_time FROM doctor';
    db.query(sql, function (error, results) {
        if (error) {
            return next(error);
        }

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
router.get("/reservation/:doctorId", (req, res) => {
    const doctorId = req.params.doctorId;
    res.render("reservation.hbs", {
        doctorId: doctorId
    });
});

router.get("/signin", (req, res) => {
    res.render("Plogin");
});

router.get("/editprofile", (req, res) => {
    res.render("editprofile.hbs");
});

router.get("/doctorlogin", (req, res) => {
    res.render("doctorlogin.hbs");
});
router.get("/doctorsignin", (req, res) => {
    res.render("doctorlogin");
});
router.get("/doctoraccount", (req, res) => {
    res.render("doctoraccount.hbs");
});
router.get("/doctoraccount", (req, res) => {
    if (!req.session.daoctorname) {
        return res.redirect('/Plogin');
    } else {
        console.log(`Session Name: ${req.session.daoctorname}`);
        console.log(`Session id: ${req.session.doctorid}`);
        console.log(`Session image: ${req.session.doctorimage}`);
        res.render('doctoraccount.hbs', {
            doctorname: req.session.daoctorname,
            doctorProfileImage: req.session.doctorimage
        });
    }
});

module.exports = router;