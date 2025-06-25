const router = require('express').Router();
const quizzController = require('../controllers/quiz.controller')


router.post("/category", quizzController.newCategory);

router.get("/category/all", quizzController.getAllCategory);

router.get("/question/all", quizzController.getOneQuestion)

router.post("/question", quizzController.newQuizz);

router.get("/question/:id", quizzController.getOneQuestion);


module.exports = router;