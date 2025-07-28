// services/quiz.service.js
const Category = require("../../models/quiz.model");
const UserModel = require("../../models/user.model")

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
      questions: questionsWithFullPictureUrl,

    },
  };
}

async function updateUserScore(userId, pointsToAdd) {
  try {
    const user = await UserModel.findById(userId);

    if (!user) return;

    // Calcul du nouveau score sans descendre en dessous de 0
    const newScore = Math.max(0, user.score + pointsToAdd);

    await UserModel.findByIdAndUpdate(
      userId,
      { $inc: { score: pointsToAdd } }, // incrémente directement
      { new: true }
    );
  } catch (err) {
    console.error("Erreur lors de la mise à jour du score :", err);
  }
}

module.exports = {
  getRandomSubThemeQuestions, updateUserScore,
};
