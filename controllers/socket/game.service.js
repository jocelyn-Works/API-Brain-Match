const { getRandomSubThemeQuestions } = require("../../controllers/socket/quiz.service");

const waitingRoomsByCategory = {};
const roomsState = {}; // état de la room : question courante, si déjà validée

function socketGame(io) {
  io.on("connection", (socket) => {
    
    socket.on("join_game", async (userData) => {
      const { username, categoryId } = userData;

      if (!categoryId) {
        socket.emit("error", { message: "Catégorie non fournie" });
        return;
      }

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

        const quiz = await getRandomSubThemeQuestions(categoryId);
        if (!quiz) {
          io.to(roomId).emit("error", { message: "Aucune question pour cette catégorie." });
          return;
        }

        // Initialiser l'état de la room
        roomsState[roomId] = {
          quiz,
          currentQuestionIndex: 0,
          questionAnswered: false, // question non encore validée
          playersAnswered: new Set(), // sockets qui ont déjà répondu pour éviter multi réponses
        };

        io.to(roomId).emit("start_game", {
          roomId,
          players: [player1.userData, player2.userData],
          message: "La partie commence !",
          quiz,
        });

        console.log(`Partie démarrée dans ${roomId} pour la catégorie ${categoryId}`);
      }
    });

    // Nouveau : écoute la réponse d'un joueur
    socket.on("submit_answer", ({ roomId, answer }) => {
      const state = roomsState[roomId];
      if (!state) {
        socket.emit("error", { message: "Room inconnue" });
        return;
      }

      // Vérifie que le joueur n'a pas déjà répondu
      if (state.playersAnswered.has(socket.id)) {
        socket.emit("error", { message: "Vous avez déjà répondu à cette question." });
        return;
      }

      // Si question déjà répondue correctement, on ignore
      if (state.questionAnswered) {
        socket.emit("info", { message: "Question déjà validée." });
        return;
      }

      const currentQuestion = state.quiz.subTheme.questions[state.currentQuestionIndex];

      if (!currentQuestion) {
        socket.emit("error", { message: "Question non trouvée." });
        return;
      }

      // Enregistre que ce joueur a répondu
      state.playersAnswered.add(socket.id);

      // Vérifie la réponse
      const isCorrect = answer === currentQuestion.correctAnswer; // adapte selon ta structure

      if (isCorrect) {
        state.questionAnswered = true;
        // Diffuse la bonne réponse à tous les joueurs de la room
        io.to(roomId).emit("question_result", {
          correctAnswer: currentQuestion.correctAnswer,
          message: `${socket.id} a répondu correctement !`,
          winnerSocketId: socket.id,
        });
      } else {
        // Optionnel : on peut aussi informer que c’est incorrect, mais laisser l’autre joueur répondre
        socket.emit("answer_result", { correct: false, message: "Mauvaise réponse, essayez encore." });
      }
    });

    socket.on("disconnect", () => {
      for (const catId in waitingRoomsByCategory) {
        waitingRoomsByCategory[catId] = waitingRoomsByCategory[catId].filter(p => p.socket.id !== socket.id);
      }
      // Nettoyer l'état des rooms si besoin (à améliorer)
      for (const roomId in roomsState) {
        if (roomsState[roomId].playersAnswered.has(socket.id)) {
          roomsState[roomId].playersAnswered.delete(socket.id);
        }
      }
      console.log(`Déconnexion : ${socket.id}`);
    });
  });
}

module.exports = socketGame;






// const { getRandomSubThemeQuestions } = require("../../controllers/socket/quiz.service");

// const waitingRoomsByCategory = {};

// function socketGame(io) {
//   io.on("connection", (socket) => {
    
//     //console.log(`connected !!`);
//     //console.log('socket connecté :', socket.id);
//     socket.on("join_game", async (userData) => {
//       const { username, categoryId,  } = userData;  // rejoindre une partie avec nom dutilisateur + une category de question

//       if (!categoryId) {
//         socket.emit("error", { message: "Catégorie non fournie" });
//         return;
//       }

//       console.log(`${username} attend dans la catégorie ${categoryId}`);

//       if (!waitingRoomsByCategory[categoryId]) {
//         waitingRoomsByCategory[categoryId] = [];
//       }

//       waitingRoomsByCategory[categoryId].push({ socket, userData });

//       if (waitingRoomsByCategory[categoryId].length === 2) {
//         const player1 = waitingRoomsByCategory[categoryId].shift();
//         const player2 = waitingRoomsByCategory[categoryId].shift();

//         const roomId = `room-${player1.socket.id}-${player2.socket.id}`;
//         player1.socket.join(roomId);
//         player2.socket.join(roomId);

//         const quiz = await getRandomSubThemeQuestions(categoryId); // question pour la category choisi

//         if (!quiz) {
//           io.to(roomId).emit("error", { message: "Aucune question pour cette catégorie." });
//           return;
//         }

//         io.to(roomId).emit("start_game", {
//           roomId,
//           players: [player1.userData, player2.userData],
//           message: "La partie commence !",
//           quiz


          
//         });

//         let questions = quiz.subTheme.questions;

//         questions.forEach(element => {
//           console.log(element)
          
//         });
        
//         console.log(`Partie démarrée dans ${roomId} pour la catégorie ${categoryId}`);
        
        

        
        
          
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

// module.exports = socketGame;
