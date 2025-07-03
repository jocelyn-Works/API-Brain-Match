const { getRandomSubThemeQuestions } = require("../../controllers/socket/quiz.service");

const UserModel = require("../../models/user.model"); // adapte le chemin si besoin
const jwt = require('jsonwebtoken')

const waitingRoomsByCategory = {};
const activeGames = {};

function socketGame(io) {
  io.on("connection", (socket) => {

    socket.on("join_game", async ({ token, categoryId }) => {

      if (!token || !categoryId) {
        return socket.emit("error", { message: "Token ou catégorie manquants" });
      }

      let decoded;
      try {
        decoded = jwt.verify(token, process.env.TOKEN_SECRET);
      } catch (err) {
        return socket.emit("error", { message: "Token invalide" });
      }

      const user = await UserModel.findById(decoded.id).select("username picture score");
      if (!user) {
        return socket.emit("error", { message: "Utilisateur introuvable" });
      }

      const fullData = {
        _id: user._id,
        username: user.username,
        picture: user.picture,
        score: user.score,
        categoryId
      };

      // ajout joueur ds room
      if (!waitingRoomsByCategory[categoryId]) {
        waitingRoomsByCategory[categoryId] = [];
      }
      waitingRoomsByCategory[categoryId].push({ socket, userData: fullData });

      // lancement game
      if (waitingRoomsByCategory[categoryId].length === 2) {
        const player1 = waitingRoomsByCategory[categoryId].shift();
        const player2 = waitingRoomsByCategory[categoryId].shift();

        // creation room ID / 2 joueurs ds la meme room donc ds le meme objet 
        const roomId = `room-${player1.socket.id}-${player2.socket.id}`;
        player1.socket.join(roomId);
        player2.socket.join(roomId);

        const quiz = await getRandomSubThemeQuestions(categoryId); // recupération des questions en fonction de la categorie

        // si quiz introuvable
        if (!quiz) {
          io.to(roomId).emit("error", { message: "Aucune question pour cette catégorie." });
          return;
        }

        // initialisation du score a 0 
        activeGames[roomId] = {
          quiz,
          scores: {
            [player1.userData.username]: 0,
            [player2.userData.username]: 0
          }
        };

        // event start game / recupere bien les users connectes ???
        io.to(roomId).emit("start_game", {
          roomId,
          players: [player1.userData, player2.userData],
          message: "La partie commence !",
          quiz
        });

        // juste pr afficher les questions server side 
        let questions = quiz.subTheme.questions;

        questions.forEach(element => {
          console.log(element)

        });

        console.log(`Partie démarrée dans ${roomId} pour la catégorie ${categoryId}`);
      }
    });

    const answeredQuestions = {}; // { roomId: { questionIndex: { username: answer } } }

    // quand un joueur repond a une question
    socket.on('player_answer', (data) => {

      // def des data recup
      const { roomId, questionIndex, answer, username } = data;

      // stockage des reponses
      if (!answeredQuestions[roomId]) answeredQuestions[roomId] = {};
      if (!answeredQuestions[roomId][questionIndex]) answeredQuestions[roomId][questionIndex] = {};
      answeredQuestions[roomId][questionIndex][username] = answer;

      // verif si les 2 joueurs ont repondu
      const answers = answeredQuestions[roomId][questionIndex];
      const players = Object.keys(answers);

      // Suppose que la room a 2 joueurs
      if (players.length === 2) {
        const quiz = activeGames[roomId].quiz;
        const correctAnswer = quiz.subTheme.questions[questionIndex].answer;

        // m a j du score
        const playersScores = players.map((player) => {
          const isCorrect = answers[player] === correctAnswer;
          if (!activeGames[roomId].scores[player]) activeGames[roomId].scores[player] = 0;
          if (isCorrect) activeGames[roomId].scores[player]++;
          return {
            username: player,
            score: activeGames[roomId].scores[player],
          };
        });

        // resultat envoye a la room          
        io.to(roomId).emit('question_result', {
          correctAnswer,
          playersScores,
          nextQuestionIndex: questionIndex + 1,
        });
      }
    });

    // deconnexion
    socket.on("disconnect", () => {
      console.log(`Déconnexion : ${socket.id}`);
      for (const catId in waitingRoomsByCategory) {
        waitingRoomsByCategory[catId] = waitingRoomsByCategory[catId].filter(p => p.socket.id !== socket.id);
      }
    });
  });
}

module.exports = socketGame;
