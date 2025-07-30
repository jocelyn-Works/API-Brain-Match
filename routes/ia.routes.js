const router = require('express').Router();
const iaController = require('../controllers/ia.controller.js');

router.post("/generate", iaController.iaQuizz);

module.exports = router;