const fs = require("fs").promises;
const path = require("path");

// Types de fichiers autorisés
const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];
const maxSize = 500000; // 500 Ko

/**
 * Service générique pour uploader un fichier image
 * @param {Buffer} fileBuffer - contenu brut du fichier
 * @param {string} mimetype - type MIME (ex: image/jpeg)
 * @param {string} targetDir - dossier cible relatif à /uploads
 * @param {string} fileName - nom du fichier final (ex: category_1234.jpg)
 * @returns {string} chemin public relatif (ex: './uploads/categories/category_1234.jpg')
 */
async function uploadImage(fileBuffer, mimetype, targetDir, fileName) {
  if (!allowedMimeTypes.includes(mimetype)) {
    throw new Error("invalide file");
  }

  if (fileBuffer.length > maxSize) {
    throw new Error("max size");
  }

  const uploadDirectory = path.join(__dirname, '..', 'uploads', targetDir);
  const uploadPath = path.join(uploadDirectory, fileName);

  // Crée le dossier si besoin
  await fs.mkdir(uploadDirectory, { recursive: true });

  // Écrit le fichier
  await fs.writeFile(uploadPath, fileBuffer);

  // Retourne le chemin accessible publiquement
  return `./uploads/${targetDir}/${fileName}`;
}

module.exports = { uploadImage };
