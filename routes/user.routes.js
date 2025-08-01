const router = require('express').Router();

const userController = require('../controllers/user.controller.js');
const uploadController = require('../controllers/upload.controller.js');

const multer = require('multer');
const storage = multer.memoryStorage(); // Stocke le fichier en mémoire
const upload = multer({ storage: storage });



// upload
router.post("/upload", upload.single('file'), uploadController.uploadProfil);

// all user
router.get("/", userController.getAllUsers);
// one user
router.get("/:id", userController.getOneUser)
// update one user 
router.patch("/:id", userController.updateUser);
// delete user
router.delete("/:id", userController.deleteUser);


////////////////////////////////////////////////////////////////////////
router.patch("/friend/send/:senderId/:receiverId", userController.sendFriendRequest);   //user qui veut ajouter / un userID
router.patch("/friend/accept/:userId/:requesterId", userController.acceptFriendRequest); // acepter => // userID  / friendRequestsID
router.delete("/friend/delete/:userId/:requesterId", userController.deleteFriendRequest); //  delete => // 
router.get("/friend-requests/:userId", userController.getFriendRequests);



module.exports = router;