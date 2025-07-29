const { uploadImage } = require("../service/upload.service");
const { uploadErrors } = require("../utils/error.utils");

const path = require("path");
const fs = require("fs/promises");

const UserModel = require("../models/user.model");

module.exports.uploadProfil = async (req, res) => {
  try {
    const userId = req.body.userId;
    const fileName = `user_${userId}.jpg`;

    // Supprime ancienne image si existe
    const user = await UserModel.findById(userId);
    if (user?.picture) {
      const oldFilePath = path.join(__dirname, "..", user.picture);
      await fs.unlink(oldFilePath).catch((err) => {
        console.warn(
          `Impossible de supprimer l'ancienne image: ${err.message}`
        );
      });
    }

    // Upload via le service
    const imagePath = await uploadImage(
      req.file.buffer,
      req.file.mimetype,
      "profil",
      fileName
    );

    const updatedUser = await UserModel.findByIdAndUpdate(
      userId,
      { picture: imagePath },
      { new: true, upsert: true }
    );

    // Génération de l'URL absolue de l'image
    const baseUrl = `${req.protocol}://${req.get("host")}`;
    const pictureUrl = imagePath
      ? `${baseUrl}/${imagePath.replace(/^\.?\/*/, "")}`
      : null;

    // Réponse uniquement avec l'URL
    return res.status(200).json({ picture: pictureUrl });
  } catch (err) {
    console.error("Raw upload error:", err);
    const errors = uploadErrors(err);
    return res
      .status(400)
      .json({ errors, rawMessage: err.message, rawError: err });
  }
};
