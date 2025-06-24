const router = require('express').Router();
const authController = require('../controllers/auth.controller.js');
const userController = require('../controllers/user.controller.js')

////// authentification /////
// register
router.post("/register", authController.signUp);
// login 
router.post("/login", authController.signIn);
/////////////////////////////////////////////////

// all user
router.get("/all", userController.getAllUsers);
// update one user 
router.put("/:id", userController.updateUser);

router.patch("/friend/send/:senderId/:receiverId", userController.sendFriendRequest);
router.patch("/friend/accept/:userId/:requesterId", userController.acceptFriendRequest);
router.get("/friend-requests/:userId", userController.getFriendRequests);



module.exports = router;