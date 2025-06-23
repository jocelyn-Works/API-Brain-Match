const router = require('express').Router();
const authController = require('../controllers/auth.controller.js');

// authentification 

// inscription
router.post("/register", authController.signUp);


// login 
router.post("/login", authController.signIn);


module.exports = router;