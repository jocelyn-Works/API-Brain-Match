// services/quiz.service.js
const Category = require("../../models/quiz.model");

async function getRandomSubThemeQuestions(categoryId) {
  const category = await Category.findById(categoryId).lean();
  if (!category || !category.subThemes || category.subThemes.length === 0)
    return null;

  const randomSubTheme =
      category.subThemes[Math.floor(Math.random() * category.subThemes.length)];

  const baseUrl = `http://localhost:${process.env.PORT}`; 

  const questionsWithFullPictureUrl = randomSubTheme.questions.map((q) => ({
    _id: q._id,
    question: q.question,
    image: q.image ? `${baseUrl}/${q.image.replace(/^\.?\/*/, "")}` : null,
    options: q.options,
    answer: q.answer,
  }));

  return {
    category: {
      id: category._id,
      theme: category.theme,
    },
    subTheme: {
      title: randomSubTheme.title,
      questions:  questionsWithFullPictureUrl ,
        
    },
  };
}

module.exports = {
  getRandomSubThemeQuestions,
};
