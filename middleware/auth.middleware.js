const jwt = require('jsonwebtoken');
const UserModel = require('../models/user.model');

const verifyToken = (token, secret) => {
  return new Promise((resolve, reject) => {
    jwt.verify(token, secret, (err, decoded) => {
      if (err) reject(err);
      else resolve(decoded);
    });
  });
};

module.exports.checkUser = async (req, res, next) => {
  const token = req.cookies.jwt;

  if (!token) {
    res.locals.user = null;
    return next();
  }

  try {
    const decodedToken = await verifyToken(token, process.env.TOKEN_SECRET);
    const user = await UserModel.findById(decodedToken.id);
    res.locals.user = user;
    console.log(res.locals.user);
    next();
  } catch (err) {
    res.locals.user = null;
    res.cookie("jwt", "", { maxAge: 1 }); 
    next();
  }
};



module.exports.requireAuth = async (req, res, next) => {
  // Récupérer le token soit dans les cookies, soit dans l'en-tête Authorization Bearer
  const token = req.cookies.jwt || (req.headers.authorization && req.headers.authorization.startsWith('Bearer ') ? req.headers.authorization.split(' ')[1] : null);

  if (!token) {
    console.log('No token');
    return res.status(401).json({ message: 'Pas de token fourni' });
  }

  try {
    const decodedToken = await verifyToken(token, process.env.TOKEN_SECRET);
    console.log(decodedToken.id);
    

    
    res.locals.userId = decodedToken.id;
    next();
  } catch (err) {
    console.log(err);
    return res.status(401).json({ message: 'Token invalide ou expiré' });
  }
};
