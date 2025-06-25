const express = require("express");
const mongoose = require('mongoose');
const path = require('path');



const http = require('http');
const socketIo = require('socket.io');

require("dotenv").config({ path: "./config/.env" });
const userRoutes = require("./routes/user.routes");
const quizRoutes = require("./routes/quiz.route")

const {checkUser, requireAuth} = require('./middleware/auth.middleware');

const app = express();

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));



mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log("MongoDB connecté"))
.catch(err => console.error("Erreur MongoDB:", err));


app.use(express.json()); // POUR PARSER LES JSON
app.use(express.urlencoded({ extended: true }));

app.get("/", (req, res) => {
  res.json("hello api !!!");
});

// jwt 
// app.get("*", checkUser);
// app.get("/jwtid", requireAuth, (req, res) => {
//   res.status(200).send(res.locals.user._id)
// });

// routes
app.use("/api/user", userRoutes);
app.use("/api/quiz", quizRoutes);

// server
app.listen(process.env.PORT, () => {
  console.log(`application Node : http://127.0.0.1:${process.env.PORT}`);
});