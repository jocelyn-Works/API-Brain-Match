const UserModel = require('../models/user.model');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { signUpErrors, signInErrors } = require('../utils/error.utils');

// 3 jours / 24 heures / 60 minutes / 60 secondes / 1000 millisecondes
const maxAge = 3 * 24 * 60 * 60 * 1000;

const createToken = (id) => {
  return jwt.sign({ id }, process.env.TOKEN_SECRET, {
    expiresIn: maxAge
  })
};

// Inscription
module.exports.signUp = async (req, res) => {
  const { username, email, password } = req.body

  try {
    const user = await UserModel.create({ username, email, password });
    res.status(201).json({ user: user._id });
  }
  catch (err) {
    const errors = signUpErrors(err);
    res.status(400).send({ errors })
  }
};

// Connexion
module.exports.signIn = async (req, res) => {
  try {
    const { identifier, password } = req.body;

    //  email OU username
    const user = await UserModel.findOne({
      $or: [{ email: identifier }, { username: identifier }]
    });

    if (!user) {
      return res.status(401).json({ message: "Identifiant ou mot de passe incorrect" });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ message: "Identifiant ou mot de passe incorrect" });
    }

    const token = createToken(user._id);

    res.status(200).json({
      token,
      user
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


// Deconnexion
module.exports.logout = (req, res) => {
  res.cookie('jwt', '', { maxAge: 1 });
  res.redirect('/');
}