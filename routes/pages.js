const express = require('express');
const router = express.Router();


router.get("/accuiel", (req, res) => {
    res.render("accuiel"); 
});
router.get("/Plogin", (req, res) => {
    res.render("Plogin"); 
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
    console.log(`Session Name: ${req.session.name}`);
    console.log(`Session id: ${req.session.userId}`);
    console.log(`Session image: ${req.session.image }`);
    if(req.session.name) {
        res.render('patientacount.hbs', { 
            username: req.session.name, 
            userProfileImagePath: req.session.image  // Pass the image path to the template
        });
    } else {
        res.redirect('/Plogin'); 
    }
});
router.get("/reservationsam", (req, res) => {

    res.render("reservationsam.hbs");
});
router.get("/signin", (req, res) => {
    res.render("Plogin"); 
});

router.get("/editprofile", (req, res) => {
    res.render("editprofile.hbs"); 
});

module.exports = router;