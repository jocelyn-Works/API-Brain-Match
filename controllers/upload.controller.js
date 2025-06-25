const { uploadImage } = require("../service/upload.service");
const { uploadErrors } = require("../utils/error.utils");
const UserModel = require("../models/user.model")

module.exports.uploadProfil = async (req, res) => {
  try {
    const userId = req.body.userId;
    const fileName = `user_${userId}.jpg`;

    // Supprime ancienne image si existante
    const user = await UserModel.findById(userId);
    if (user?.picture) {
      const oldFilePath = path.join(__dirname, '..', user.picture);
      await fs.unlink(oldFilePath).catch(() => {}); // ignore si le fichier n'existe pas
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

    res.send(updatedUser);
  } catch (err) {
  console.error("Raw upload error:", err);
  const errors = uploadErrors(err);
  return res.status(400).json({ errors, rawMessage: err.message, rawError: err });
}
};
