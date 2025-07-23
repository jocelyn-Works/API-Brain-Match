const express = require("express");
const http = require("http");
const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config({ path: "./config/.env" });
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
app.use(cors());
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' }
});

// midelware client
app.use(express.json()); // POUR PARSER LES JSON
app.use(express.urlencoded({ extended: true }));

app.use("/uploads", express.static(path.join(__dirname, "uploads")));

////// DB  ///////
mongoose
  .connect(process.env.MONGO_URI, {})
  .then(() => console.log("MongoDB connecté"))
  .catch((err) => {
    console.error("MongoDB connection error:", err.message);
    process.exit(1);
  });

app.get("/", (req, res) => {
  res.json("hello api !!!");
});

// const {checkUser, requireAuth} = require('./middleware/auth.middleware');
// jwt
// app.get("*", checkUser);
// app.get("/jwtid", requireAuth, (req, res) => {
//   res.status(200).send(res.locals.user._id)
// });

// routes
const userRoutes = require("./routes/user.routes");
const quizRoutes = require("./routes/quiz.routes");

app.use("/api/user", userRoutes);
app.use("/api/quiz", quizRoutes);

const socketGame = require("./controllers/socket/game.service");

// const socketChessGame = require("./controllers/socket/chess.service"); // echec

socketGame(io);

// socketChessGame(io); // service échecs

// server
server.listen(process.env.PORT, () => {
  console.log(`application Node : http://127.0.0.1:${process.env.PORT}`);
});
