const Category = require("../models/quiz.model");
const ObjectID = require("mongoose").Types.ObjectId;
const { uploadImage } = require("../service/upload.service");


module.exports.newCategory = async (req, res) => {
  try {
    const { theme, description } = req.body;

    if (!theme || !description) {
      return res.status(400).json({ message: "Theme et description sont requis." });
    }

    if (!req.files?.logo?.[0] || !req.files?.image?.[0]) {
      return res.status(400).json({ message: "Logo et image sont requis." });
    }

    const logoFile = req.files.logo[0];
    const imageFile = req.files.image[0];

    const logoPath = await uploadImage(
      logoFile.buffer,
      logoFile.mimetype,
      "category/logo",
      `logo_${Date.now()}.${logoFile.mimetype.split('/')[1]}`
    );

    const imagePath = await uploadImage(
      imageFile.buffer,
      imageFile.mimetype,
      "category/image",
      `image_${Date.now()}.${imageFile.mimetype.split('/')[1]}`
    );

    const newCategory = new Category({
      theme,
      description,
      logo: logoPath,
      image: imagePath,
      subThemes: [] // vide à la création
    });

    await newCategory.save();

    return res.status(201).json(newCategory);
  } catch (err) {
    console.error("Erreur création catégorie :", err);
    return res.status(500).json({ message: err.message });
  }
};


module.exports.newQuizz = async (req, res) => {
  try {
    const { categoryId, subThemeTitle, questions } = req.body;

    if (!categoryId || !subThemeTitle || !questions) {
      return res.status(400).json({ message: "Champs requis manquants." });
    }

    const parsedQuestions = JSON.parse(questions);
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

    // tableau de questions
    const questionsList = [];

    for (let i = 0; i < parsedQuestions.length; i++) {
      const q = parsedQuestions[i];
      const img = imageFiles[i];
      const ext = img.mimetype.split("/")[1];
      const fileName = `question_${Date.now()}_${i}.${ext}`;

      const imagePath = await uploadImage(img.buffer, img.mimetype, "quizz", fileName);

      questionsList.push({
        question: q.question,
        options: q.options,
        answer: q.answer,
        image: imagePath,
      });
    }

    const newSubTheme = {
      title: subThemeTitle,
      questions: questionsList,
    };

    category.subThemes.push(newSubTheme);
    await category.save();

    return res.status(201).json({ message: "Sous-thème créé avec succès.", category });
  } catch (err) {
    console.error("Erreur ajout sous-thème :", err);
    return res.status(500).json({ message: err.message });
  }
};





module.exports.getAllCategory = async (req, res) => {
  try {
    // On récupère uniquement le titre des subThemes (pas leurs questions)
    const categories = await Category.find().lean();

    const baseUrl = `${req.protocol}://${req.get("host")}`;

    const categoriesWithoutQuestions = categories.map((category) => {
     
      const cleanedSubThemes = category.subThemes?.map((subTheme) => ({
        title: subTheme.title 
      })) || [];

      return {
        ...category,
        subThemes: cleanedSubThemes,
        logo: category.logo
          ? `${baseUrl}/${category.logo.replace(/^\.?\/*/, "")}`
          : null,
        image: category.image
          ? `${baseUrl}/${category.image.replace(/^\.?\/*/, "")}`
          : null,
      };
    });

    return res.status(200).json(categoriesWithoutQuestions);
  } catch (err) {
    console.error("Erreur récupération catégories :", err);
    return res.status(500).json({ message: err.message });
  }
};


module.exports.getOneQuestion = async (req, res) => {
  try {
    const categoryId = req.params.id;

    if (!ObjectID.isValid(categoryId)) {
      return res.status(400).send("ID Inconnu : " + categoryId);
    }

    const category = await Category.findById(categoryId).lean();

    if (!category || !category.subThemes || category.subThemes.length === 0) {
      return res.status(404).json({ message: "Aucun sous-thème trouvé pour cette catégorie." });
    }

    const randomIndex = Math.floor(Math.random() * category.subThemes.length);
    const randomSubTheme = category.subThemes[randomIndex];

    const baseUrl = `${req.protocol}://${req.get("host")}`;

    const questionsWithFullPictureUrl = randomSubTheme.questions.map((q) => {
      return {
        ...q,
        image: q.image
          ? `${baseUrl}/${q.image.replace(/^\.?\/*/, "")}`
          : null,
      };
    });

    return res.status(200).json({
      category: category.theme,
      subTheme: {
        title: randomSubTheme.title,
        questions: questionsWithFullPictureUrl
      }
    });
  } catch (err) {
    console.error("Erreur getRandomSubThemeFromCategory :", err);
    return res.status(500).json({ message: err.message });
  }
};
