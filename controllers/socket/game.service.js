const { getRandomSubThemeQuestions, updateUserScore } = require("../../controllers/socket/quiz.service");
const UserModel = require("../../models/user.model");
const jwt = require("jsonwebtoken");

const waitingRoomsByCategory = {};
const activeGames = {};
const gameStateByRoom = {};

function socketGame(io) {
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    try {
      const decoded = jwt.verify(token, process.env.TOKEN_SECRET);
      socket.user = decoded;
      next();
    } catch (err) {
      return next(new Error("Token invalide"));
    }
  });

  io.on("connection", (socket) => {

    socket.on("join_game", async ({ categoryId }) => {
      if (!categoryId) return socket.emit("error", { message: "Catégorie manquante" });

      const user = await UserModel.findById(socket.user.id).select("username picture score");
      if (!user) return socket.emit("error", { message: "Utilisateur introuvable" });

      const fullData = {
        _id: user._id,
        username: user.username,
        picture: user.picture,
        score: user.score,
        categoryId
      };

      if (!waitingRoomsByCategory[categoryId]) {
        waitingRoomsByCategory[categoryId] = [];
      }

      waitingRoomsByCategory[categoryId].push({ socket, userData: fullData });

      if (waitingRoomsByCategory[categoryId].length === 2) {
        const player1 = waitingRoomsByCategory[categoryId].shift();
        const player2 = waitingRoomsByCategory[categoryId].shift();

        const roomId = `room-${player1.socket.id}-${player2.socket.id}`;
        player1.socket.join(roomId);
        player2.socket.join(roomId);

        const quiz = await getRandomSubThemeQuestions(categoryId);
        if (!quiz || !quiz.subTheme.questions.length) {
          io.to(roomId).emit("error", { message: "Aucune question disponible." });
          return;
        }

        activeGames[roomId] = {
          quiz,
          scores: {
            [player1.userData.username]: 0,
            [player2.userData.username]: 0
          }
        };

        gameStateByRoom[roomId] = {
          players: {
            [player1.socket.id]: {
              answered: false,
              username: player1.userData.username,
              _id: player1.userData._id
            },
            [player2.socket.id]: {
              answered: false,
              username: player2.userData.username,
              _id: player2.userData._id
            }
          },
          currentQuestionIndex: 0,
          totalQuestions: quiz.subTheme.questions.length,
          quiz,
          timeoutId: null,
          correctAnswers: quiz.subTheme.questions.map(q => q.answer)
        };

        io.to(roomId).emit("start_game", {
          roomId,
          players: [player1.userData, player2.userData],
          message: "La partie commence !",
          question: quiz.subTheme.questions[0],
          questionIndex: 0,
          totalQuestions: quiz.subTheme.questions.length
        });

        startQuestionTimer(io, roomId);
      }
    });

    socket.on("player_answer", ({ roomId, questionIndex, answer }) => {
      const roomState = gameStateByRoom[roomId];
      if (!roomState || questionIndex !== roomState.currentQuestionIndex) return;
      if (!roomState.players[socket.id] || roomState.players[socket.id].answered) return;

      const playerInfo = roomState.players[socket.id];
      const username = playerInfo.username;
      const correctAnswer = roomState.correctAnswers[questionIndex];
      const correct = answer.trim().toLowerCase() === correctAnswer.trim().toLowerCase();

      if (!activeGames[roomId].scores[username]) {
        activeGames[roomId].scores[username] = 0;
      }
      if (correct) {
        activeGames[roomId].scores[username]++;
      }

      roomState.players[socket.id].answered = true;
      roomState.players[socket.id].correct = correct;

      socket.emit("answer_feedback", {
        correctAnswer,
        yourAnswer: answer,
        correct,
        yourScore: activeGames[roomId].scores[username]
      });

      const allAnswered = Object.values(roomState.players).every(p => p.answered);

      if (allAnswered) {
        // Les deux joueurs ont répondu → on annule le timer et on avance rapidement
        clearTimeout(roomState.timeoutId);

        setTimeout(() => {
          sendNextQuestion(io, roomId);
        }, 2000);

      } else {
        console.log("joueurs n'ont pas rep")
      }
    });

    socket.on("disconnect", () => {
      console.log(`Déconnexion : ${socket.id}`);

      // Retirer des salles d'attente
      for (const catId in waitingRoomsByCategory) {
        waitingRoomsByCategory[catId] = waitingRoomsByCategory[catId].filter(p => p.socket.id !== socket.id);
      }

      // Gérer l'abandon en jeu
      for (const roomId in gameStateByRoom) {
        if (gameStateByRoom[roomId].players[socket.id]) {
          io.to(roomId).emit("opponent_left", {
            message: "Votre adversaire a quitté la partie."
          });

          clearTimeout(gameStateByRoom[roomId].timeoutId);
          delete gameStateByRoom[roomId];
          delete activeGames[roomId];

          // resetRoomState(io, roomId);

          break;
        }
      }
    });
  });
}

// Lance un timer de 10 secondes pour la question actuelle
function startQuestionTimer(io, roomId) {
  const roomState = gameStateByRoom[roomId];
  if (!roomState) return;

  roomState.timeoutId = setTimeout(() => {
    sendNextQuestion(io, roomId);
  }, 10000);
}

async function sendNextQuestion(io, roomId) {
  const roomState = gameStateByRoom[roomId];
  if (!roomState) return;

  // 💥 On annule tout ancien timer, au cas où
  if (roomState.timeoutId) {
    clearTimeout(roomState.timeoutId);
    roomState.timeoutId = null;
  }

  const index = ++roomState.currentQuestionIndex;
  const quiz = roomState.quiz;

  // console.log(index)

  if (index >= quiz.subTheme.questions.length) {

    const finalScores = activeGames[roomId].scores;

    io.to(roomId).emit("game_over", {
      scores: finalScores
    });

    clearTimeout(roomState.timeoutId);
    delete gameStateByRoom[roomId];
    delete activeGames[roomId];

    // test
    // io.in(roomId).socketsLeave(roomId);
    // io.in(roomId).disconnectSockets(true);

    // resetRoomState(io, roomId);

    return;
  }

  // Réinitialiser le statut des joueurs
  Object.keys(roomState.players).forEach(id => {
    roomState.players[id].answered = false;
  });

  const fullQuestion = quiz.subTheme.questions[index];
  io.to(roomId).emit("new_question", {
    question: fullQuestion,
    questionIndex: index
  });

  startQuestionTimer(io, roomId);
}

module.exports = socketGame;