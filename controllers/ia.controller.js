const axios = require("axios");

function extractJsonBlock(text) {
  const match = text.match(/```json\s*([\s\S]*?)\s*```/);
  if (match && match[1]) {
    return match[1];
  }
  return null;
}

module.exports.iaQuizz = async (req, res) => {
  const theme = req.body.theme;
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
    const response = await axios.post("http://localhost:11434/api/generate", {
      model: "mistral:latest",
      prompt,
      stream: false,
    });

    const raw = response.data.response;
    const jsonBlock = extractJsonBlock(raw);
    if (!jsonBlock) {
      return res.status(500).json({ error: 'Impossible d’extraire le JSON depuis la réponse.', details: raw });
    }

    const quiz = JSON.parse(jsonBlock);

    return res.json(quiz );
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Erreur lors de la génération du quiz.' });
  }
};
