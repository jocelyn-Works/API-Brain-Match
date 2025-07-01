const { getRandomSubThemeQuestions } = require("../../controllers/socket/quiz.service");

const waitingRoomsByCategory = {};

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

        let questions = quiz.subTheme.questions;

        questions.forEach(element => {
          console.log(element)
          
        });
        
        console.log(`Partie démarrée dans ${roomId} pour la catégorie ${categoryId}`);
        
        //console.log(questions)
        
        //console.log(quiz.subTheme.questions)

        
        
          
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

module.exports = socketGame;
