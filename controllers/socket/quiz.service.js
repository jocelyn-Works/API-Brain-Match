// services/quiz.service.js
const Category = require("../../models/quiz.model");
const UserModel = require("../../models/user.model");

const axios = require("axios");

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

    // Calcul du nouveau score (jamais négatif)
    const newScore = Math.max(0, user.score + pointsToAdd);

    await UserModel.findByIdAndUpdate(
      userId,
      { score: newScore }, // incrémente directement
      { new: true }
    );
  } catch (err) {
    console.error("Erreur lors de la mise à jour du score :", err);
  }
}

function extractJsonBlock(text) {
  const match = text.match(/```json\s*([\s\S]*?)\s*```/);
  if (match && match[1]) {
    return match[1];
  }
  return null;
}

async function generateIaQuiz(theme) {
  if (!theme) throw new Error("Le thème est obligatoire");

  const currentYear = new Date().getFullYear();

  const prompt = `
  Crée-moi un quiz amusant et interactif sur le thème "${theme}" en étant à jour avec les dernières actualités jusqu'en ${currentYear}, avec des questions fun, légères et parfois décalées, tout en restant compréhensibles pour tout public.
        
  ➤ 10 questions.
  ➤ 4 options et 1 seule bonne réponse par question.
  ➤ Ton ludique et parfois humoristique, n'hésite pas à inclure des références populaires, des formulations rigolotes, ou des choix de réponses absurdes mais drôles.
  ➤ Format strictement JSON comme un tableau sans explication.
  example : 
  [
    {
      "question": "",
      "options": ["", "", "", ""],
      "answer": ""
    }
  ]
  Génère uniquement ce tableau JSON, sans texte supplémentaire.
  `;

  try {
    const response = await axios.post(
      "http://localhost:11434/api/generate",
      {
        model: "mistral:latest",
        prompt,
        stream: false,
      },
      {
        timeout: 120000, // ← 2 minutes
      }
    );

    const raw = response.data.response;
    const jsonBlock = extractJsonBlock(raw);

    if (!jsonBlock) {
      throw new Error("Impossible d’extraire le JSON depuis la réponse IA");
    }

    const quiz = JSON.parse(jsonBlock);

    return quiz;
  } catch (error) {
    console.error("Erreur génération quiz IA :", error);
    throw error;
  }
}

module.exports = {
  getRandomSubThemeQuestions,
  updateUserScore,
  generateIaQuiz,
};
