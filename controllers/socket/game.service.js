const { getRandomSubThemeQuestions } = require("../../controllers/socket/quiz.service");

const waitingRoomsByCategory = {};
const gameStateByRoom = {};


function socketGame(io) {
  io.on("connection", (socket) => {

    //console.log(`connected !!`);
    //console.log('socket connecté :', socket.id);
    socket.on("join_game", async (userData) => {
      const { username, categoryId,  } = userData;  // rejoindre une partie avec nom dutilisateur + une category de question

      if (!categoryId) {
        socket.emit("error", { message: "Catégorie non fournie" });
        return;
      }

      console.log(`${username} attend dans la catégorie ${categoryId}`);

      if (!waitingRoomsByCategory[categoryId]) {
        waitingRoomsByCategory[categoryId] = [];
      }

      waitingRoomsByCategory[categoryId].push({ socket, userData });

      if (waitingRoomsByCategory[categoryId].length === 2) {
        const player1 = waitingRoomsByCategory[categoryId].shift();
        const player2 = waitingRoomsByCategory[categoryId].shift();

        const roomId = `room-${player1.socket.id}-${player2.socket.id}`;
        player1.socket.join(roomId);
        player2.socket.join(roomId);

        const quiz = await getRandomSubThemeQuestions(categoryId); // question pour la category choisi

        if (!quiz) {
          io.to(roomId).emit("error", { message: "Aucune question pour cette catégorie." });
          return;
        }

        io.to(roomId).emit("start_game", {
          roomId,
          players: [player1.userData, player2.userData],
          message: "La partie commence !",
          quiz
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
        // 10 secondes pour répondre à la première question
        gameStateByRoom[roomId].timeoutId = setTimeout(() => {
          io.to(roomId).emit("next_question");
          resetRoomState(io, roomId);
        }, 10000);



        let questions = quiz.subTheme.questions;

        questions.forEach(element => {
          console.log(element)

        });

        console.log(`Partie démarrée dans ${roomId} pour la catégorie ${categoryId}`);






      }
    });

    socket.on("player_answer", ({ roomId, questionIndex, answer, correct }) => {
      const roomState = gameStateByRoom[roomId];
      if (!roomState) return;

      if (questionIndex !== roomState.currentQuestionIndex) return; // réponse en décalage

      roomState.players[socket.id] = { answered: true };

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

  // Incrémente la question courante
  roomState.currentQuestionIndex++;

  // Vérifie s’il reste des questions
  if (roomState.currentQuestionIndex >= roomState.totalQuestions) {
    delete gameStateByRoom[roomId];
    return;
  }

  // Réinitialise les réponses
  Object.keys(roomState.players).forEach(id => {
    roomState.players[id].answered = false;
  });

  // Relance un timeout pour la prochaine question
  roomState.timeoutId = setTimeout(() => {
    io.to(roomId).emit("next_question");
    resetRoomState(io, roomId);
  }, 10000);
}


module.exports = socketGame;