const mongoose = require("mongoose");

const historySchema = new mongoose.Schema({
    player1: { type: String, required: true },
    player2: { type: String, default: "Bot" },
    players: [{ type: String }],
    mode: { type: String, default: "Friend Match" },
    score1: { type: Number, default: 0 },
    score2: { type: Number, default: 0 },
    scores: { type: mongoose.Schema.Types.Mixed, default: {} },
    winner: { type: String, required: true },
    howOut: { type: String, default: "OUT" },
    gameType: { type: String, default: "handcricket" },
    date: { type: Date, default: Date.now }
});

module.exports = mongoose.model("History", historySchema);
