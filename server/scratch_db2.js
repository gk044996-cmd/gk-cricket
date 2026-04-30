require('dotenv').config();
const mongoose = require('mongoose');
const Game = require('./models/Game');

mongoose.connect(process.env.MONGO_URI).then(async () => {
    let type = "memory-flip";
    let player1 = "gan1@gmail.com";
    let player2 = "Bot";
    let mode = "bot_standard";
    let status = "playing";
    let target = null;
    let initialState = {};
    let playersList = [player1];
    if (player2) playersList.push(player2);
    
    let cards = [1,1,2,2,3,3,4,4,5,5,6,6];
    cards.sort(() => Math.random() - 0.5);
    initialState = { cards: cards.map(c => ({ id: c, flipped: false, matched: false })), scores: {}, turnIndex: 0, flippedIndexes: [] };
    playersList.forEach(p => initialState.scores[p] = 0);
    let currentTurn = playersList[0];
    
    const newGame = new Game({
        player1, player2: playersList.length > 1 ? playersList[1] : null, 
        players: playersList,
        mode, currentTurn, status,
        target,
        gameType: type,
        gameState: initialState,
        isTossCompleted: false,
        lastPlay: { turnCount: 0 }
    });
    console.log("Before save:");
    console.log(JSON.stringify(newGame, null, 2));
    
    await newGame.save();
    console.log("After save:");
    console.log(JSON.stringify(newGame, null, 2));
    
    const fetched = await Game.findById(newGame._id);
    console.log("Fetched:");
    console.log(JSON.stringify(fetched, null, 2));
    
    process.exit(0);
});
