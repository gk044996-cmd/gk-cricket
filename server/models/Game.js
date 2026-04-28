const mongoose = require("mongoose");

const gameSchema = new mongoose.Schema({
    player1: { type: String, required: true },
    player2: { type: String, required: true },
    score1: { type: Number, default: 0 },
    score2: { type: Number, default: 0 },
    p1Move: { type: Number, default: null },
    p2Move: { type: Number, default: null },
    currentTurn: { type: String }, // Can be null before toss
    innings: { type: Number, default: 1 },
    status: { type: String, default: "toss" }, // "toss", "playing", "finished"
    winner: { type: String, default: null },
    mode: { type: String, default: "friend" }, // "friend", "bot_chase", etc.
    tossWinner: { type: String, default: null },
    tossChoice: { type: String, default: null }, // "bat" or "bowl"
    isTossCompleted: { type: Boolean, default: false },
    balls: { type: Number, default: 0 },
    target: { type: Number, default: null },
    lastPlay: {
        p1: mongoose.Schema.Types.Mixed,
        p2: mongoose.Schema.Types.Mixed,
        result: String, // "OUT" or "runs"
        runs: Number,
        turnCount: { type: Number, default: 0 }
    }
});

module.exports = mongoose.model("Game", gameSchema);
