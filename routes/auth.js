const express = require('express');
const authController =require ('../controllers/auth');
const multer = require('multer');
const upload = multer({ dest: 'public/uploads/' });
const router = express.Router();


router.post("/login", authController.login);
router.post("/signin",authController.signin);
router.post("/forget-password",authController.forgetPassword);
router.post("/resetpassword",authController.resetpassword);
router.get("/search",authController.search);
router.post("/reservation/:doctorId",authController.reservation);
//router.post('/editprofile', upload.single('fileToUpload'), authController.editprofile);

module.exports = router;