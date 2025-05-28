const express = require("express");
require("dotenv").config({ path: "./config/.env" });
const userRoutes = require("./routes/user.routes");

const app = express();

// routes
app.use("/api/user", userRoutes);
app.use("/api/quiz", quizRoutes);

// server
app.listen(process.env.PORT, () => {
  console.log(`application Node : http://127.0.0.1:${process.env.PORT}`);
});