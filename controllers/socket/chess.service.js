// const { Chess } = require('chess.js');
// const UserModel = require("../../models/user.model");
// const jwt = require("jsonwebtoken");

// const waitingPlayers = []; // file d’attente simple
// const activeGames = {};    // roomId => { game, players }

// function socketGame(io) {
//     io.use((socket, next) => {
//         const token = socket.handshake.auth.token;
//         try {
//             const decoded = jwt.verify(token, process.env.TOKEN_SECRET);
//             socket.user = decoded;
//             next();
//         } catch (err) {
//             return next(new Error("Token invalide"));
//         }
//     });

//     io.on("connection", (socket) => {
//         console.log(`Joueur connecté : ${socket.id}`);

//         socket.on("join_game", async () => {
//             const user = await UserModel.findById(socket.user.id).select("username picture score");
//             if (!user) return socket.emit("error", { message: "Utilisateur introuvable" });

//             const player = { socket, user };

//             // Ajoute le joueur à la file d'attente
//             waitingPlayers.push(player);

//             // Si 2 joueurs, démarre la partie
//             if (waitingPlayers.length >= 2) {
//                 const player1 = waitingPlayers.shift();
//                 const player2 = waitingPlayers.shift();

//                 const roomId = `room-${player1.socket.id}-${player2.socket.id}`;
//                 player1.socket.join(roomId);
//                 player2.socket.join(roomId);

//                 const game = new Chess();

//                 activeGames[roomId] = {
//                     game,
//                     players: {
//                         white: player1,
//                         black: player2
//                     }
//                 };

//                 // Envoie l'événement de démarrage aux deux joueurs
//                 player1.socket.emit("start_game", {
//                     roomId,
//                     color: "white",
//                     opponent: player2.user,
//                     fen: game.fen()
//                 });

//                 player2.socket.emit("start_game", {
//                     roomId,
//                     color: "black",
//                     opponent: player1.user,
//                     fen: game.fen()
//                 });
//             }
//         });

//         // Lorsqu’un joueur fait un coup
//         socket.on("move", ({ roomId, move }) => {
//             const gameData = activeGames[roomId];
//             if (!gameData) return;

//             const { game, players } = gameData;
//             const result = game.move(move); // move = { from: 'e2', to: 'e4', promotion: 'q' }

//             if (!result) {
//                 return socket.emit("invalid_move", { message: "Coup illégal" });
//             }

//             // Envoie la mise à jour aux deux joueurs
//             io.to(roomId).emit("move_played", {
//                 move: result,
//                 fen: game.fen(),
//                 turn: game.turn(),
//                 inCheckmate: game.in_checkmate(),
//                 gameOver: game.game_over()
//             });

//             if (game.game_over()) {
//                 const winnerColor = game.in_checkmate() ? (game.turn() === 'w' ? 'black' : 'white') : null;
//                 const winner = winnerColor ? players[winnerColor].user.username : null;

//                 io.to(roomId).emit("game_over", {
//                     reason: game.in_checkmate() ? "checkmate" : "draw",
//                     winner
//                 });

//                 delete activeGames[roomId];
//             }
//         });

//         socket.on("disconnect", () => {
//             console.log(`Déconnexion : ${socket.id}`);

//             // Retirer de la file d'attente
//             const index = waitingPlayers.findIndex(p => p.socket.id === socket.id);
//             if (index !== -1) waitingPlayers.splice(index, 1);

//             // Retirer de la partie si en cours
//             for (const roomId in activeGames) {
//                 const { players } = activeGames[roomId];
//                 if (players.white.socket.id === socket.id || players.black.socket.id === socket.id) {
//                     io.to(roomId).emit("opponent_left", { message: "Votre adversaire a quitté la partie." });
//                     delete activeGames[roomId];
//                     break;
//                 }
//             }
//         });
//     });
// }

// module.exports = socketGame;
