const UserModel = require("../models/user.model");
const ObjectID = require("mongoose").Types.ObjectId;

// all users
module.exports.getAllUsers = async (req, res) => {
  try {
    const users = await UserModel.find().select("-password");

    const baseUrl = `${req.protocol}://${req.get("host")}`;

    const usersWithFullPictureUrl = users.map((user) => {
      return {
        ...user._doc,
        picture: user.picture
          ? `${baseUrl}/${user.picture.replace(/^\.?\/*/, "")}`
          : null,
      };
    });

    res.status(200).json(usersWithFullPictureUrl);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// one user by id
module.exports.getOneUser = async (req, res) => {
  try {
    if (!ObjectID.isValid(req.params.id)) {
      return res.status(400).send("ID Inconnue : " + req.params.id);
    }

    // -  password
    const user = await UserModel.findById(req.params.id).select("-password");

    // Si aucun utilisateur trouvé
    if (!user) {
      return res.status(404).send("Utilisateur non trouvé.");
    }

    // URL complète pour l'image + info user
    const baseUrl = `${req.protocol}://${req.get("host")}`;
    const userWithFullPictureUrl = {
      ...user._doc,
      picture: user.picture
        ? `${baseUrl}/${user.picture.replace(/^\.?\/*/, "")}`
        : null,
    };

    res.status(200).json(userWithFullPictureUrl);
  } catch (err) {
    console.log("Erreur lors de la récupération de l'utilisateur : ", err);
    res.status(500).json({ error: err.message });
  }
};

// update user
module.exports.updateUser = async (req, res) => {
  const userId = req.params.id;

  if (!ObjectID.isValid(userId))
    return res.status(400).send("ID Inconnue : " + userId);

  const { username, email } = req.body;

  try {
    if (username) {
      const existingUser = await UserModel.findOne({
        username,
        _id: { $ne: userId },
      });
      if (existingUser) {
        return res
          .status(409)
          .json({ message: "Le nom d'utilisateur est déjà utilisé." });
      }
    }

    if (email) {
      const existingUser = await UserModel.findOne({
        email,
        _id: { $ne: userId },
      });
      if (existingUser) {
        return res
          .status(409)
          .json({ message: "L'email est déjà utilisé." });
      }
    }

    const updatedUser = await UserModel.findOneAndUpdate(
      { _id: userId },
      {
        $set: {
          username: req.body.username,
          email: req.body.email,
        },
      },
      { new: true, upsert: false, setDefaultsOnInsert: true }
    ).select("-password");

    res.send(updatedUser);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

module.exports.deleteUser = async (req, res) => {
  if (!ObjectID.isValid(req.params.id))
    return res.status(400).send("ID inconnue : " + req.params.id);

  try {
    const deletedUser = await UserModel.findByIdAndDelete(req.params.id);

    if (!deletedUser) {
      return res.status(404).send("Utilisateur non trouvé");
    }

    res.status(200).send({ message: "Utilisateur supprimé avec succès" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports.sendFriendRequest = async (req, res) => {
  const { senderId, receiverId } = req.params;

  if (senderId === receiverId) {
    return res
      .status(400)
      .json({ message: "Vous ne pouvez pas vous ajouter vous-même" });
  }

  try {
    const sender = await UserModel.findById(senderId);
    const receiver = await UserModel.findById(receiverId);

    if (!sender || !receiver) {
      return res.status(404).json({ message: "Utilisateur non trouvé" });
    }

    // Déjà ami ?
    if (receiver.friends.includes(senderId)) {
      return res.status(400).json({ message: "Vous êtes déjà amis" });
    }

    // Déjà une demande en cours ?
    if (receiver.friendRequests.includes(senderId)) {
      return res.status(400).json({ message: "Demande déjà envoyée" });
    }

    receiver.friendRequests.push(senderId);

    if (!sender.sentFriendRequests?.includes(receiverId)) {
      sender.sentFriendRequests = sender.sentFriendRequests || [];
      sender.sentFriendRequests.push(receiverId);
    }

    await receiver.save();
    await sender.save();

    res.status(200).json({ message: "Demande d’ami envoyée" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports.getFriendRequests = async (req, res) => {
  const { userId } = req.params;

  try {
    const user = await UserModel.findById(userId).populate(
      "friendRequests",
      "username picture email score friends friendRequests sentFriendRequests"
    );

    if (!user) {
      return res.status(404).json({ message: "Utilisateur non trouvé" });
    }

    const baseUrl = `${req.protocol}://${req.get("host")}`;

    // Mapper les friendRequests avec URL complète pour picture
    const formattedFriendRequests = user.friendRequests.map((friend) => {
      return {
        _id: friend._id,
        username: friend.username,
        email: friend.email,
        score: friend.score,
        friends: friend.friends,
        friendRequests: friend.friendRequests,
        sentFriendRequests: friend.sentFriendRequests,
        picture: friend.picture
          ? `${baseUrl}/${friend.picture.replace(/^\.?\/*/, "")}`
          : null,
      };
    });

    res.status(200).json(formattedFriendRequests);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports.acceptFriendRequest = async (req, res) => {
  const { userId, requesterId } = req.params;

  try {
    const user = await UserModel.findById(userId);
    const requester = await UserModel.findById(requesterId);

    if (!user || !requester) {
      return res.status(404).json({ message: "Utilisateur non trouvé" });
    }

    // Vérifie que la demande existe
    if (!user.friendRequests.includes(requesterId)) {
      return res
        .status(400)
        .json({ message: "Aucune demande de cet utilisateur" });
    }

    // Ajouter dans la liste d'amis
    user.friends.push(requesterId);
    requester.friends.push(userId);

    // Retirer la demande
    user.friendRequests = user.friendRequests.filter(
      (id) => id.toString() !== requesterId
    );

    await user.save();
    await requester.save();

    res
      .status(200)
      .json({ message: "Demande acceptée, vous êtes maintenant amis" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports.deleteFriendRequest = async (req, res) => {
  const { userId, requesterId } = req.params;

  try {
    const user = await UserModel.findById(userId);
    const requester = await UserModel.findById(requesterId);

    if (!user || !requester) {
      return res.status(404).json({ message: "Utilisateur non trouvé" });
    }

    // Vérifie que la demande d'ami existe
    if (!user.friendRequests.includes(requesterId)) {
      return res
        .status(400)
        .json({ message: "Aucune demande de cet utilisateur" });
    }

    user.friendRequests = user.friendRequests.filter(
      (id) => id.toString() !== requesterId
    );

    if (requester.sentFriendRequests) {
      requester.sentFriendRequests = requester.sentFriendRequests.filter(
        (id) => id.toString() !== userId
      );
    }

    await user.save();
    await requester.save();

    res.status(200).json({ message: "Demande d'ami supprimée avec succès" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
