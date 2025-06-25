const router = require('express').Router();
const authController = require('../controllers/auth.controller.js');
const userController = require('../controllers/user.controller.js');
const uploadController = require('../controllers/upload.controller.js');

const multer = require('multer');
const storage = multer.memoryStorage(); // Stocke le fichier en mémoire
const upload = multer({ storage: storage });

////// authentification /////
// register
router.post("/register", authController.signUp);
// login 
router.post("/login", authController.signIn);
/////////////////////////////////////////////////
// upload
router.post("/upload", upload.single('file'), uploadController.uploadProfil);

// all user
router.get("/", userController.getAllUsers);
// update one user 
router.put("/:id", userController.updateUser);


////////////////////////////////////////////////////////////////////////
router.patch("/friend/send/:senderId/:receiverId", userController.sendFriendRequest);
router.patch("/friend/accept/:userId/:requesterId", userController.acceptFriendRequest);
router.get("/friend-requests/:userId", userController.getFriendRequests);



module.exports = router;