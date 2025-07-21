const  { getRandomSubThemeQuestions, updateUserScore } = require ("../../controllers/socket/quiz.service.js");

const mongoose = require("mongoose");

const waitingRoomsByCategory = {};
const games = {};

function socketGame(io) {
  io.on("connection", (socket) => {
    socket.on("join_game", async (userData) => {
      const { username, categoryId, userId } = userData;

      if (!categoryId || !mongoose.Types.ObjectId.isValid(userId)) {
        socket.emit("error", { message: "Catégorie ou ID utilisateur invalide." });
        return;
      }

      if (!waitingRoomsByCategory[categoryId]) {
        waitingRoomsByCategory[categoryId] = [];
      }

      waitingRoomsByCategory[categoryId].push({ socket, userData });

      if (waitingRoomsByCategory[categoryId].length >= 2) {
        const player1 = waitingRoomsByCategory[categoryId].shift();
        const player2 = waitingRoomsByCategory[categoryId].shift();

        const roomId = `room-${player1.socket.id}-${player2.socket.id}`;
        player1.socket.join(roomId);
        player2.socket.join(roomId);

        const quiz = await getRandomSubThemeQuestions(categoryId);

        if (!quiz || !quiz.subTheme.questions.length) {
          io.to(roomId).emit("error", {
            message: "Aucune question pour cette catégorie.",
          });
          return;
        }

        const questions = quiz.subTheme.questions;

        games[roomId] = {
          players: {
            [player1.socket.id]: { 
              username: player1.userData.username, 
              userId: player1.userData.userId, 
              score: 0 
            },
            [player2.socket.id]: { 
              username: player2.userData.username, 
              userId: player2.userData.userId, 
              score: 0 
            },
          },
          sockets: [player1.socket, player2.socket],
          questions,
          currentQuestionIndex: 0,
          answersReceived: {},
          timeout: null, // Pour gérer le timer
        };

        sendNextQuestion(io, roomId);
      }
    });

    socket.on("answer_question", ({ roomId, answer }) => {
      const game = games[roomId];
      if (!game) return;

      const playerId = socket.id;
      const currentQuestion = game.questions[game.currentQuestionIndex];

      // Ignore si déjà répondu
      if (game.answersReceived[playerId]) return;

      game.answersReceived[playerId] = answer;

      if (answer === currentQuestion.answer) {
        game.players[playerId].score++;
      }

      // Si les deux joueurs ont répondu avant la fin du timer
      if (Object.keys(game.answersReceived).length === 2) {
        clearTimeout(game.timeout); // stop le timer
        handleAnswerResult(io, roomId);
      }
    });

    socket.on("disconnect", () => {
      console.log(`Déconnexion : ${socket.id}`);

      for (const catId in waitingRoomsByCategory) {
        waitingRoomsByCategory[catId] = waitingRoomsByCategory[catId].filter(
          (p) => p.socket.id !== socket.id
        );
      }

      for (const roomId in games) {
        const game = games[roomId];
        if (game.players[socket.id]) {
          io.to(roomId).emit("player_disconnected", {
            message: `Joueur ${game.players[socket.id].username} a quitté la partie.`,
          });
          clearTimeout(game.timeout);
          delete games[roomId];
        }
      }
    });
  });
}

// 🔁 Envoie la prochaine question avec timeout
function sendNextQuestion(io, roomId) {
  const game = games[roomId];
  if (!game) return;

  const question = game.questions[game.currentQuestionIndex];
  io.to(roomId).emit("new_question", {
    index: game.currentQuestionIndex + 1,
    total: game.questions.length,
    question: {
      text: question.question,
      options: question.options,
      image: question.image,
    },
    timeLimit: 10, // 10 secondes
  });

  // Timer de 10 secondes
  game.timeout = setTimeout(() => {
    handleAnswerResult(io, roomId);
  }, 10000);
}

// ✅ Gère fin de question (2 réponses OU timeout)
function handleAnswerResult(io, roomId) {
  const game = games[roomId];
  if (!game) return;

  const currentQuestion = game.questions[game.currentQuestionIndex];

  io.to(roomId).emit("answer_result", {
    correctAnswer: currentQuestion.answer,
    scores: game.players,
  });

  game.currentQuestionIndex++;
  game.answersReceived = {};

  if (game.currentQuestionIndex < game.questions.length) {
    setTimeout(() => {
      sendNextQuestion(io, roomId);
    }, 3000); // pause de 3s avant prochaine question
  } else {
    endGame(io, roomId);
  }
}

// 🏁 Fin de partie
async function endGame(io, roomId) {
  const game = games[roomId];
  if (!game) return;

  const players = Object.values(game.players);
  const scores = players.map(p => p.score);
  const maxScore = Math.max(...scores);

  // Attribution des points
  let resultMessage = "";
  if (scores[0] === scores[1]) {
    resultMessage = "Match nul ! 5 points chacun.";
    await Promise.all(players.map(p => updateUserScore(p.userId, 5)));
  } else {
    const winner = players.find(p => p.score === maxScore);
    resultMessage = `Victoire de ${winner.username} (+10 pts)`;
    await updateUserScore(winner.userId, 10);
  }

  io.to(roomId).emit("game_over", {
    message: resultMessage,
    finalScores: game.players,
  });

  delete games[roomId];
}



module.exports = socketGame;
