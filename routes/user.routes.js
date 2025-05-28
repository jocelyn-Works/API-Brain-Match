const router = require('express').Router();
const authController = require('../controllers/auth.controller.js');

// authentification 
router.get("/register", authController.signUp);



module.exports = router;