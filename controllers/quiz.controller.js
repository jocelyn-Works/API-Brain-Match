const Category = require("../models/quiz.model");
const ObjectID = require("mongoose").Types.ObjectId;
const { uploadImage } = require("../service/upload.service");


module.exports.newCategory = async (req, res) => {
  try {
    const { theme, description } = req.body;

    if (!req.files || !req.files.logo || !req.files.image) {
      return res.status(400).json({ message: "Logo et image sont requis." });
    }

    const logoFile = req.files.logo[0];
    const imageFile = req.files.image[0];

    // Uploader le logo (ex: dossier 'categories/logo')
    const logoPath = await uploadImage(
      logoFile.buffer,
      logoFile.mimetype,
      "category/logo",
      `logo_${Date.now()}.${logoFile.mimetype.split('/')[1]}`
    );

    // Upload de l'image (ex: dossier 'categories/image')
    const imagePath = await uploadImage(
      imageFile.buffer,
      imageFile.mimetype,
      "category/image",
      `image_${Date.now()}.${imageFile.mimetype.split('/')[1]}`
    );

    // Créer la catégorie en stockant les chemins vers logo et image
    const newCategory = new Category({
      theme,
      description,
      logo: logoPath,
      image: imagePath,
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
    const parsedQuestions = JSON.parse(questions); // parse le tableau JSON

    const imageFiles = req.files?.image || [];

    if (!Array.isArray(parsedQuestions) || parsedQuestions.length === 0) {
      return res.status(400).json({ message: "Aucune question reçue." });
    }

    if (imageFiles.length !== parsedQuestions.length) {
      return res.status(400).json({
        message: "Le nombre d'images ne correspond pas au nombre de questions.",
      });
    }

    const category = await Category.findById(categoryId);
    if (!category) {
      return res.status(404).json({ message: "Catégorie non trouvée." });
    }

    // Pour chaque question + image associée
    for (let i = 0; i < parsedQuestions.length; i++) {
      const q = parsedQuestions[i];
      const img = imageFiles[i];

      const ext = img.mimetype.split("/")[1];
      const fileName = `question_${Date.now()}_${i}.${ext}`;

      const imagePath = await uploadImage(img.buffer, img.mimetype, "quizz", fileName);

      const newQuestion = {
        question: q.question,
        options: q.options,
        answer: q.answer,
        image: imagePath,
      };

      category.questions.push(newQuestion);
    }

    await category.save();

    return res.status(201).json({ message: "Questions ajoutées avec succès.", category });
  } catch (err) {
    console.error("Erreur:", err.message);
    return res.status(500).json({ message: err.message });
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
