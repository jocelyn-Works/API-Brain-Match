const router = require('express').Router();
const authController = require('../controllers/auth.controller.js');
const { requireAuth } = require('../middleware/auth.middleware.js')
////// authentification /////


router.post("/register", authController.signUp);

router.post("/login", authController.signIn);

router.get('/me', requireAuth, authController.getProfile);
router.post("/logout", authController.logout);


/////////////////////////////////////////////

module.exports = router;