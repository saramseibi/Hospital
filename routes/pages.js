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
router.get("/resetpasswored", (req, res) => {
  res.render("resetpasswored.hbs"); 
}); 


router.get("/signin", (req, res) => {
    res.render("Plogin"); 
});



module.exports = router;