const mongoose = require("mongoose");

const historySchema = new mongoose.Schema({
    player1: { type: String, required: true },
    player2: { type: String, required: true },
    mode: { type: String, default: "Friend Match" },
    score1: { type: Number, required: true },
    score2: { type: Number, required: true },
    winner: { type: String, required: true },
    howOut: { type: String, default: "OUT" },
    date: { type: Date, default: Date.now }
});

module.exports = mongoose.model("History", historySchema);
