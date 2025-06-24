const express = require("express");
const mongoose = require('mongoose');

require("dotenv").config({ path: "./config/.env" });
const userRoutes = require("./routes/user.routes");



const app = express();



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

// routes
app.use("/api/user", userRoutes);
//app.use("/api/quiz", quizRoutes);

// server
app.listen(process.env.PORT, () => {
  console.log(`application Node : http://127.0.0.1:${process.env.PORT}`);
});