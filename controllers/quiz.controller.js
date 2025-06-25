const Category = require("../models/quiz.model");
const ObjectID = require("mongoose").Types.ObjectId;

module.exports.newCategory = async (req, res) => {
  const { theme, logo, description, image } = req.body;
  try {
    const newCategory = new Category({
      theme,
      description,
    });

    await newCategory.save();
    return res.status(200).json(newCategory);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

module.exports.newQuizz = async (req, res) => {
  try {
    const { categoryId, questions } = req.body;

    const category = await Category.findById(categoryId);

    if (!category) {
      return res.status(404).json({ message: "Category non trouvée" });
    }

    if (!Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({ message: "Aucune question fournie" });
    }

    // Ajout direct de chaque question dans la catégorie
    for (const q of questions) {
      const { question, options, answer } = q;

      if (!question || !Array.isArray(options) || !answer) {
        return res.status(400).json({ message: "Une des questions est incomplète" });
      }

      category.questions.push({ question, options, answer });
    }

    await category.save();

    res
      .status(201)
      .json({ message: `${questions.length} question(s) ajoutée(s) avec succès.`, category });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur serveur" });
  }
};


module.exports.getAllCategory = async (req, res) => {
  const category = await Category.find().select("-questions");
  res.status(200).json(category);
};

module.exports.getOneQuestion = async (req, res) => {
  if (!ObjectID.isValid(req.params.id))
    return res.status(400).send("ID Inconnue : " + req.params.id);

  const question = await Category.findById(ObjectID);
  res.status(200).json(question);
};
