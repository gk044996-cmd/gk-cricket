const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
    {
        username: {
            type: String,
            required: true,
            unique: true,
        },
        email: {
            type: String,
            required: true,
            unique: true,
        },
        password: {
            type: String,
            required: true,
        },

        // XP + LEVEL + COINS + DAILY REWARDS
        bio: { type: String, default: "" },
        profilePicture: { type: String, default: "" },
        xp: { type: Number, default: 0 },
        level: { type: Number, default: 1 },
        coins: { type: Number, default: 0 },
        lastLoginReward: { type: Date, default: null },
        loginStreak: { type: Number, default: 0 },
        lastSpinWheel: { type: Date, default: null },
        
        // STATS
        stats: {
            totalMatches: { type: Number, default: 0 },
            totalWins: { type: Number, default: 0 },
            totalLosses: { type: Number, default: 0 },
            winStreak: { type: Number, default: 0 },
            bestStreak: { type: Number, default: 0 },
            gameStats: { type: mongoose.Schema.Types.Mixed, default: {} }
        },
        // SHOP SYSTEM
        inventory: [{ type: String }],
        equipped: { type: mongoose.Schema.Types.Mixed, default: {} },
        
        // REWARDS
        lastDailyLogin: { type: Date, default: null },
        dailyStreak: { type: Number, default: 0 },
        lastSpinDate: { type: Date, default: null },

        // 👇 NEW
        friends: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "User",
            },
        ],

        friendRequests: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "User",
            },
        ],
        gameInvites: [
            {
                requester: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
                gameType: { type: String, default: "handcricket" },
                gameId: { type: mongoose.Schema.Types.ObjectId, ref: "Game", default: null }
            }
        ],
        isOnline: {
            type: Boolean,
            default: false,
        },
        lastSeen: {
            type: Date,
            default: Date.now,
        },
    },
    { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);