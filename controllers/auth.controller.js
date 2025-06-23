const UserModel = require('../models/user.model');
const jwt = require('jsonwebtoken');
const { signUpErrors, signInErrors } = require('../utils/error.utils');

   // 3 jours / 24 heures / 60 minutes / 60 secondes / 1000 millisecondes
const maxAge = 3 * 24 * 60 * 60 * 1000;

const createToken = (id) => {
  return jwt.sign({id}, process.env.TOKEN_SECRET, {
    expiresIn: maxAge
  })
};

// Inscription
module.exports.signUp = async (req, res) => {
    const {username, email, password} = req.body

    try{
        const user = await UserModel.create({username, email, password});
        res.status(201).json({ user: user._id});
    }
    catch(err){
        const errors = signUpErrors(err);
        res.status(200).send({ errors })
    }
};

// Connexion
module.exports.signIn = async (req, res) => {
    const { identifier, password } = req.body;

    try {
        // Vérifiez si l'identifiant est un email ou un nom d'utilisateur
        const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier);

        let user;
        if (isEmail) {
            // connexion par email
            user = await UserModel.loginWithEmail(identifier, password);
        } else {
            // nom d'utilisateur
            user = await UserModel.loginWithUsername(identifier, password);
        }

        const token = createToken(user._id);
        res.cookie('jwt', token, { httpOnly: true, maxAge });
        res.status(200).json({ user: user._id });
    } catch (err) {
        const errors = signInErrors(err);
        res.status(200).json({ errors });
    }
};

// Deconnexion
module.exports.logout = (req, res) => {
    res.cookie('jwt', '', { maxAge: 1});
    res.redirect('/');
}