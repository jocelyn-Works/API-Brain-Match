const express = require("express");
const http = require("http");
const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config({ path: "./config/.env" });
const { Server } = require("socket.io");
const cors = require("cors");
// const cookieParser = require('cookie-parser');

const app = express();
// app.use(cookieParser());

app.use(cors());
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' }
});

// Middleware client
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// FRONT ADMIN
app.use(express.static(path.join(__dirname, "public")));
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "admin.html"));
});

// DB connection
mongoose
  .connect(process.env.MONGO_URI, {})
  .then(() => console.log("MongoDB connecté"))
  .catch((err) => {
    console.error("MongoDB connection error:", err.message);
    process.exit(1);
  });


// Import des middlewares auth
//const { checkUser, requireAuth } = require('./middleware/auth.middleware');

// Import des routes
const authRoutes = require("./routes/auth.routes");
const userRoutes = require("./routes/user.routes");
const quizRoutes = require("./routes/quiz.routes");

// Routes publiques (login / register)
// app.use('/api', (req, res, next) => {
//   if (req.path === '/login' || req.path === '/register') {
//     return next(); // on skip checkUser pour ces routes publiques
//   }
//   checkUser(req, res, next);
// });

app.use("/api", authRoutes);

// Routes protégées par requireAuth
// app.use('/api/user', requireAuth, userRoutes);
// app.use('/api/quiz', requireAuth, quizRoutes);
app.use('/api/user', userRoutes);
app.use('/api/quiz', quizRoutes);

// Socket.io
const socketGame = require("./controllers/socket/game.service");

// const socketChessGame = require("./controllers/socket/chess.service"); // echec

socketGame(io);

// socketChessGame(io); // service échecs

// server
server.listen(process.env.PORT, () => {
  console.log(`application Node : http://127.0.0.1:${process.env.PORT}`);
});
