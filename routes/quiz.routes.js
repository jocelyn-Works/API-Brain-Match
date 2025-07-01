const router = require('express').Router();
const quizzController = require('../controllers/quiz.controller');

const multer = require('multer');
const upload = multer();


router.post("/category", upload.fields([
  { name: 'logo', maxCount: 1 },
  { name: 'image', maxCount: 1 },
]), quizzController.newCategory);

router.get("/category", quizzController.getAllCategory);

router.post("/question",upload.fields([{ name: "image"}]), quizzController.newQuizz);

router.get("/question/:id", quizzController.getOneQuestionByCategory);



module.exports = router;