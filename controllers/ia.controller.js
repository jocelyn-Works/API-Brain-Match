const { generateIaQuiz } = require("./socket/quiz.service");

module.exports.iaQuizz = async (req, res) => {
  const theme = req.body.theme;

  if (!theme) {
    return res.status(400).json({ error: "Thème manquant" });
  }

  try {
    const questions = await generateIaQuiz(theme);

    if (!questions || !questions.length) {
      return res.status(500).json({ error: "Quiz IA vide ou invalide." });
    }

    return res.json(questions);
  } catch (error) {
    console.error("Erreur quiz IA :", error);
    return res.status(500).json({ error: "Erreur lors de la génération du quiz IA." });
  }
};
