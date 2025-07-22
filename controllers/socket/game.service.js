const { getRandomSubThemeQuestions } = require("../../controllers/socket/quiz.service");
const UserModel = require("../../models/user.model");
const jwt = require("jsonwebtoken");

const waitingRoomsByCategory = {};
const activeGames = {};
const gameStateByRoom = {};

function socketGame(io) {
  io.use((socket, next) => {
    // const authHeader = socket.handshake.headers['authorization'];
    // const authHeader = socket.handshake.auth.token;

    // if (!authHeader || !authHeader.startsWith('Bearer ')) {
    //   return next(new Error('Token manquant ou mal formé'));
    // }

    // const token = authHeader.split(' ')[1];

    const token = socket.handshake.auth.token;

    console.log(token)

    try {
      const decoded = jwt.verify(token, process.env.TOKEN_SECRET);
      socket.user = decoded; // Stocke l'id de l'utilisateur
      next();
    } catch (err) {
      return next(new Error('Token invalide'));
    }
  });

  io.on("connection", (socket) => {

    socket.on("join_game", async ({ categoryId }) => {
      if (!categoryId) {
        return socket.emit("error", { message: "Catégorie manquante" });
      }

      const user = await UserModel.findById(socket.user.id).select("username picture score");
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
        if (!quiz) {
          io.to(roomId).emit("error", { message: "Aucune question pour cette catégorie." });
          return;
        }

        activeGames[roomId] = {
          quiz,
          scores: {
            [player1.userData.username]: 0,
            [player2.userData.username]: 0
          }
        };

        io.to(roomId).emit("start_game", {
          roomId,
          players: [player1.userData, player2.userData],
          message: "La partie commence !",
          quiz
          // question: quiz.subTheme.questions[0], // ⚠️ Une seule question
          // questionIndex: 0
        });

        gameStateByRoom[roomId] = {
          players: {
            [player1.socket.id]: { answered: false },
            [player2.socket.id]: { answered: false }
          },
          currentQuestionIndex: 0,
          totalQuestions: quiz.subTheme.questions.length,
          quiz,
          timeoutId: null
        };

        gameStateByRoom[roomId].timeoutId = setTimeout(() => {
          // gameStateByRoom[roomId].currentQuestionIndex++;
          // sendNextQuestion(io, roomId);
          io.to(roomId).emit("next_question");
          resetRoomState(io, roomId);
        }, 10000);
      }
    });

    const answeredQuestions = {};

    socket.on('player_answer', (data) => {
      const { roomId, questionIndex, answer, username } = data;

      if (!answeredQuestions[roomId]) answeredQuestions[roomId] = {};
      if (!answeredQuestions[roomId][questionIndex]) answeredQuestions[roomId][questionIndex] = {};
      answeredQuestions[roomId][questionIndex][username] = answer;

      const answers = answeredQuestions[roomId][questionIndex];
      const players = Object.keys(answers);

      if (players.length === 2) {
        const quiz = activeGames[roomId].quiz;
        const correctAnswer = quiz.subTheme.questions[questionIndex].answer;

        const playersScores = players.map((player) => {
          const isCorrect = answers[player] === correctAnswer;
          if (!activeGames[roomId].scores[player]) activeGames[roomId].scores[player] = 0;
          if (isCorrect) activeGames[roomId].scores[player]++;
          return {
            username: player,
            score: activeGames[roomId].scores[player],
          };
        });

        io.to(roomId).emit('question_result', {
          correctAnswer,
          playersScores,
          nextQuestionIndex: questionIndex + 1,
        });
      }
    });

    socket.on("player_answer", ({ roomId, questionIndex }) => {
      const roomState = gameStateByRoom[roomId];
      if (!roomState || questionIndex !== roomState.currentQuestionIndex) return;

      roomState.players[socket.id].answered = true;

      const allAnswered = Object.values(roomState.players).every(p => p.answered);

      if (allAnswered) {
        clearTimeout(roomState.timeoutId);
        io.to(roomId).emit("next_question");
        resetRoomState(io, roomId);
      }
    });

    socket.on("disconnect", () => {
      console.log(`Déconnexion : ${socket.id}`);
      for (const catId in waitingRoomsByCategory) {
        waitingRoomsByCategory[catId] = waitingRoomsByCategory[catId].filter(p => p.socket.id !== socket.id);
      }
    });
  });
}

function resetRoomState(io, roomId) {
  const roomState = gameStateByRoom[roomId];
  if (!roomState) return;

  roomState.currentQuestionIndex++;

  if (roomState.currentQuestionIndex >= roomState.totalQuestions) {
    delete gameStateByRoom[roomId];
    return;
  }

  Object.keys(roomState.players).forEach(id => {
    roomState.players[id].answered = false;
  });

  roomState.timeoutId = setTimeout(() => {
    io.to(roomId).emit("next_question");
    resetRoomState(io, roomId);
  }, 10000);
}

module.exports = socketGame;

//     const answeredQuestions = {};


//     socket.on("player_answer", ({ roomId, questionIndex, answer }) => {
//       const roomState = gameStateByRoom[roomId];
//       if (!roomState || questionIndex !== roomState.currentQuestionIndex) return;
//       if (roomState.players[socket.id].answered) return;

//       const quiz = roomState.quiz;
//       const question = quiz.subTheme.questions[questionIndex];
//       const username = socket.user.username;
//       const correct = answer === question.answer;

//       if (!activeGames[roomId].scores[username]) {
//         activeGames[roomId].scores[username] = 0;
//       }
//       if (correct) {
//         activeGames[roomId].scores[username]++;
//       }

//       // Marquer comme répondu
//       roomState.players[socket.id].answered = true;

//       // Envoyer un feedback immédiat à chaque joueur
//       socket.emit("answer_feedback", {
//         correctAnswer: question.answer,
//         yourAnswer: answer,
//         correct,
//         yourScore: activeGames[roomId].scores[username]
//       });

//       // Vérifier si tout le monde a répondu
//       const allAnswered = Object.values(roomState.players).every(p => p.answered);
//       if (allAnswered) {
//         clearTimeout(roomState.timeoutId); // Stop timer
//         roomState.currentQuestionIndex++;
//         sendNextQuestion(io, roomId); // Envoie suivante
//       }
//     });

//     socket.on("disconnect", () => {
//       console.log(`Déconnexion : ${socket.id}`);
//       for (const catId in waitingRoomsByCategory) {
//         waitingRoomsByCategory[catId] = waitingRoomsByCategory[catId].filter(p => p.socket.id !== socket.id);
//       }
//     });
//   });
// }

// function sendNextQuestion(io, roomId) {
//   const roomState = gameStateByRoom[roomId];
//   if (!roomState) return;

//   const index = roomState.currentQuestionIndex;
//   const quiz = roomState.quiz;

//   if (index >= quiz.subTheme.questions.length) {
//     io.to(roomId).emit("game_over", {
//       scores: activeGames[roomId].scores
//     });
//     delete gameStateByRoom[roomId];
//     return;
//   }

//   // Reset answered state
//   Object.keys(roomState.players).forEach(id => {
//     roomState.players[id].answered = false;
//   });

//   const question = quiz.subTheme.questions[index];

//   io.to(roomId).emit("new_question", {
//     question,
//     questionIndex: index
//   });

//   roomState.timeoutId = setTimeout(() => {
//     // Si tout le monde n’a pas répondu, on passe à la suite
//     roomState.currentQuestionIndex++;
//     sendNextQuestion(io, roomId);
//   }, 10000);
// }

// module.exports = socketGame;