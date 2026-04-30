require("dotenv").config();
const bcrypt = require("bcryptjs");
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");

const User = require("./models/User");
const Game = require("./models/Game");
const History = require("./models/History");

const app = express();
app.use(cors());
app.use(express.json());

mongoose
    .connect(process.env.MONGO_URI)
    .then(() => console.log("MongoDB Connected ✅"))
    .catch((err) => console.log("Mongo Error ❌", err));

app.get("/", (req, res) => res.send("Server is running 🚀"));

// =========================
// 🔥 AUTH APIs
// =========================
app.post("/register", async (req, res) => {
    try {
        const { username, email, password } = req.body;
        if (!email || !email.endsWith("@gmail.com")) {
            return res.status(400).json("Email must end with @gmail.com");
        }
        const existingUser = await User.findOne({ email });
        if (existingUser) return res.status(400).json("User already exists");
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        const newUser = new User({ username, email, password: hashedPassword, isOnline: true, lastSeen: Date.now() });
        await newUser.save();
        res.status(201).json({ message: "User registered successfully ✅", username });
    } catch (err) { res.status(500).json("Server error"); }
});

app.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });
        if (!user) return res.status(400).json("User not found");
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json("Invalid credentials");
        user.isOnline = true;
        user.lastSeen = Date.now();
        await user.save();
        res.status(200).json({ message: "Login successful ✅", username: user.username });
    } catch (err) { res.status(500).json("Server error"); }
});

app.post("/logout", async (req, res) => {
    try {
        const { email } = req.body;
        await User.findOneAndUpdate({ email }, { isOnline: false, lastSeen: Date.now() });
        res.status(200).json("Logged out");
    } catch (err) { res.status(500).json("Server error"); }
});

app.post("/heartbeat", async (req, res) => {
    try {
        const { email } = req.body;
        if (email) await User.findOneAndUpdate({ email }, { isOnline: true, lastSeen: Date.now() });
        res.status(200).json("ok");
    } catch (err) { res.status(500).json("Server error"); }
});

app.get("/users/:email", async (req, res) => {
    try {
        const users = await User.find({ email: { $ne: req.params.email } }).lean().select("username email isOnline lastSeen friends friendRequests");
        const activeGames = await Game.find({ status: { $in: ["toss", "toss_selection", "playing"] } }).select("player1 player2 players gameType");
        const playingMap = new Map();
        activeGames.forEach(g => { 
            if(g.players) g.players.forEach(p => playingMap.set(p, g.gameType));
            else { playingMap.set(g.player1, g.gameType); playingMap.set(g.player2, g.gameType); }
        });
        users.forEach(u => {
            u.isPlaying = playingMap.has(u.email);
            u.playingGame = playingMap.get(u.email);
        });
        res.status(200).json(users);
    } catch (err) { res.status(500).json("Server error"); }
});

// =========================
// 🔥 PROFILE & FRIENDS APIs
// =========================
app.put("/update-profile", async (req, res) => {
    try {
        const { email, newUsername } = req.body;
        const user = await User.findOneAndUpdate({ email }, { username: newUsername }, { new: true });
        res.status(200).json({ username: user.username });
    } catch (err) { res.status(500).json("Server error"); }
});

app.post("/send-request", async (req, res) => {
    try {
        const { fromEmail, toEmail } = req.body;
        const fromUser = await User.findOne({ email: fromEmail });
        const toUser = await User.findOne({ email: toEmail });
        if (!fromUser || !toUser) return res.status(404).json("User not found");
        if (fromEmail === toEmail) return res.status(400).json("You cannot send request to yourself");
        if (toUser.friends.includes(fromUser._id)) return res.status(400).json("Already friends");
        if (toUser.friendRequests.includes(fromUser._id)) return res.status(400).json("Request already sent");
        toUser.friendRequests.push(fromUser._id);
        await toUser.save();
        res.status(200).json("Friend request sent ✅");
    } catch (err) { res.status(500).json("Server error"); }
});

app.post("/accept-request", async (req, res) => {
    try {
        const { userEmail, requesterEmail } = req.body;
        const user = await User.findOne({ email: userEmail });
        const requester = await User.findOne({ email: requesterEmail });
        if (!user || !requester) return res.status(404).json("User not found");
        user.friendRequests = user.friendRequests.filter((id) => id.toString() !== requester._id.toString());
        user.friends.push(requester._id);
        requester.friends.push(user._id);
        await user.save();
        await requester.save();
        res.status(200).json("Friend request accepted ✅");
    } catch (err) { res.status(500).json("Server error"); }
});

app.delete("/remove-friend", async (req, res) => {
    try {
        const { userEmail, friendEmail } = req.body;
        const user = await User.findOne({ email: userEmail });
        const friend = await User.findOne({ email: friendEmail });
        if (user && friend) {
            user.friends = user.friends.filter(id => id.toString() !== friend._id.toString());
            friend.friends = friend.friends.filter(id => id.toString() !== user._id.toString());
            await user.save();
            await friend.save();
        }
        res.status(200).json("Removed friend");
    } catch (err) { res.status(500).json("Server error"); }
});

app.get("/friends/:email", async (req, res) => {
    try {
        const user = await User.findOne({ email: req.params.email }).populate("friends", "username email isOnline lastSeen");
        if (!user) return res.status(404).json("User not found");
        const friendsLean = user.friends.map(f => f.toObject());
        const activeGames = await Game.find({ status: { $in: ["toss", "toss_selection", "playing"] } }).select("player1 player2 players gameType");
        const playingMap = new Map();
        activeGames.forEach(g => { 
            if(g.players) g.players.forEach(p => playingMap.set(p, g.gameType));
            else { playingMap.set(g.player1, g.gameType); playingMap.set(g.player2, g.gameType); }
        });
        friendsLean.forEach(f => {
            f.isPlaying = playingMap.has(f.email);
            f.playingGame = playingMap.get(f.email);
        });
        res.status(200).json(friendsLean);
    } catch (err) { res.status(500).json("Server error"); }
});

app.get("/requests/:email", async (req, res) => {
    try {
        const user = await User.findOne({ email: req.params.email }).populate("friendRequests", "username email");
        if (!user) return res.status(404).json("User not found");
        res.status(200).json(user.friendRequests);
    } catch (err) { res.status(500).json("Server error"); }
});

// =========================
// 🔥 GAME SYSTEM APIs
// =========================
app.post("/send-game-invite", async (req, res) => {
    try {
        const { fromEmail, toEmail, gameType } = req.body;
        const fromUser = await User.findOne({ email: fromEmail });
        const toUser = await User.findOne({ email: toEmail });
        if (!fromUser || !toUser) return res.status(404).json("User not found");
        const type = gameType || "handcricket";
        const exists = toUser.gameInvites.find(i => i.requester.toString() === fromUser._id.toString() && i.gameType === type);
        if (exists) return res.status(400).json("Invite already sent");
        toUser.gameInvites.push({ requester: fromUser._id, gameType: type });
        await toUser.save();
        res.status(200).json("Game invite sent");
    } catch (err) { res.status(500).json("Server error"); }
});

app.post("/send-multiplayer-invites", async (req, res) => {
    try {
        const { fromEmail, toEmails, gameType } = req.body;
        const fromUser = await User.findOne({ email: fromEmail });
        if (!fromUser) return res.status(404).json("User not found");

        const newGame = new Game({
            player1: fromEmail,
            players: [fromEmail],
            waitingFor: toEmails,
            gameType: gameType,
            status: "waiting",
            mode: "friend"
        });
        await newGame.save();

        for (const email of toEmails) {
            const u = await User.findOne({ email });
            if (u) {
                u.gameInvites.push({ requester: fromUser._id, gameType, gameId: newGame._id });
                await u.save();
            }
        }
        res.status(200).json({ gameId: newGame._id });
    } catch(err) { res.status(500).json("Server error"); }
});

app.post("/accept-game-invite", async (req, res) => {
    try {
        const { userEmail, requesterEmail, gameType, gameId } = req.body;
        const user = await User.findOne({ email: userEmail });
        const requester = await User.findOne({ email: requesterEmail });
        if (!user || !requester) return res.status(404).json("User not found");
        
        user.gameInvites = user.gameInvites.filter(i => {
             if (gameId) return i.gameId?.toString() !== gameId.toString();
             return !(i.requester.toString() === requester._id.toString() && i.gameType === gameType);
        });
        await user.save();

        if (gameId) {
             const game = await Game.findById(gameId);
             if (game && game.status === "waiting") {
                 game.waitingFor = game.waitingFor.filter(e => e !== userEmail);
                 if (!game.players.includes(userEmail)) game.players.push(userEmail);

                 if (game.waitingFor.length === 0) {
                     game.status = "playing";
                     // Initialize states
                     if (game.gameType === "snake-ladders") {
                         game.gameState = { positions: {}, turnIndex: 0, lastDice: null };
                         game.players.forEach(p => game.gameState.positions[p] = 1);
                         game.currentTurn = game.players[0];
                     } else if (game.gameType === "ludo") {
                         game.gameState = { tokens: {}, turnIndex: 0, lastDice: null, hasRolled: false };
                         game.players.forEach(p => game.gameState.tokens[p] = [0,0,0,0]);
                         game.currentTurn = game.players[0];
                     } else if (game.gameType === "memory-flip") {
                         let cards = [1,1,2,2,3,3,4,4,5,5,6,6];
                         cards.sort(() => Math.random() - 0.5);
                         game.gameState = { cards: cards.map(c => ({ id: c, flipped: false, matched: false })), scores: {}, turnIndex: 0, flippedIndexes: [] };
                         game.players.forEach(p => game.gameState.scores[p] = 0);
                         game.currentTurn = game.players[0];
                     } else if (game.gameType === "memory-number") {
                         let nums = [1,2,3,4,5,6,7,8,9];
                         nums.sort(() => Math.random() - 0.5);
                         game.gameState = { grid: nums, currentTarget: 1, attempts: 2, turnIndex: 0, revealed: [], playerLost: {} };
                         game.currentTurn = game.players[0];
                     }
                 }
                 await game.save();
                 return res.status(200).json({ gameId: game._id });
             }
        }

        let initialState = {};
        let initialStatus = "toss";
        let initialTurn = null;

        if (gameType === "hidden-number") {
            initialStatus = "playing";
            initialState = { p1Secret: null, p2Secret: null, p1Guesses: [], p2Guesses: [], turn: requester.email };
        } else if (gameType === "rps") {
            initialStatus = "playing";
            initialState = { p1Wins: 0, p2Wins: 0, rounds: [] };
        } else if (gameType === "evenodd") {
            initialStatus = "playing";
            initialState = { p1Wins: 0, p2Wins: 0, rounds: [] };
        } else if (gameType === "tictactoe") {
            initialStatus = "playing";
            initialTurn = requester.email;
            initialState = { board: Array(9).fill(null) };
        }

        const newGame = new Game({
            player1: requester.email,
            player2: user.email,
            players: [requester.email, user.email],
            gameType: gameType,
            gameState: initialState,
            mode: "friend",
            status: initialStatus,
            currentTurn: initialTurn,
            lastPlay: { turnCount: 0 }
        });
        await newGame.save();
        res.status(200).json({ gameId: newGame._id });
    } catch (err) { res.status(500).json("Server error"); }
});

app.post("/reject-game-invite", async (req, res) => {
    try {
        const { userEmail, requesterEmail, gameType } = req.body;
        const user = await User.findOne({ email: userEmail });
        const requester = await User.findOne({ email: requesterEmail });
        if (user && requester) {
            user.gameInvites = user.gameInvites.filter(i => {
                if (req.body.gameId) return i.gameId?.toString() !== req.body.gameId.toString();
                return !(i.requester.toString() === requester._id.toString() && i.gameType === gameType);
            });
            await user.save();
            
            if (req.body.gameId) {
                const game = await Game.findById(req.body.gameId);
                if (game && game.status === "waiting") {
                    game.status = "finished"; // Cancel if rejected
                    game.howOut = "Declined Invite";
                    await game.save();
                }
            }
        }
        res.status(200).json("Rejected");
    } catch (err) { res.status(500).json("Server error"); }
});

app.get("/game-invites/:email", async (req, res) => {
    try {
        const user = await User.findOne({ email: req.params.email }).populate("gameInvites.requester", "username email");
        if (!user) return res.status(404).json("User not found");
        res.status(200).json(user.gameInvites.map(i => ({
            ...i.requester._doc,
            gameType: i.gameType,
            gameId: i.gameId
        })));
    } catch (err) { res.status(500).json("Server error"); }
});

app.get("/active-game/:email", async (req, res) => {
    try {
        const game = await Game.findOne({
            $or: [{ player1: req.params.email }, { player2: req.params.email }, { players: req.params.email }],
            status: { $in: ["waiting", "toss", "toss_selection", "playing"] }
        }).sort({ _id: -1 });
        if (!game) return res.status(200).json({ active: false });
        res.status(200).json({ active: true, gameId: game._id, gameType: game.gameType, status: game.status });
    } catch (err) { res.status(500).json("Server error"); }
});

app.post("/leave-game", async (req, res) => {
    try {
        const { gameId, userEmail } = req.body;
        const game = await Game.findById(gameId);
        if(!game || game.status === "finished") return res.status(200).json("Already finished");
        game.status = "finished";
        game.winner = game.player1 === userEmail ? game.player2 : game.player1;
        game.howOut = "Abandoned";
        await game.save();

        const p1Name = game.player1 === "Bot" ? "Bot" : await User.findOne({ email: game.player1 }).then(u => u.username);
        const p2Name = game.player2 === "Bot" ? "Bot" : await User.findOne({ email: game.player2 }).then(u => u.username);
        
        let s1 = game.score1 || 0;
        let s2 = game.score2 || 0;

        if (game.gameType === 'rps' || game.gameType === 'evenodd') {
             s1 = game.gameState.p1Wins || 0;
             s2 = game.gameState.p2Wins || 0;
        } else if (game.gameType === 'hidden-number') {
             s1 = game.gameState.p1Guesses ? game.gameState.p1Guesses.length : 0;
             s2 = game.gameState.p2Guesses ? game.gameState.p2Guesses.length : 0;
        } else if (game.gameType === 'tictactoe') {
             s1 = 0; s2 = 0;
        }

        const h = new History({
            date: new Date().toLocaleDateString(),
            player1: p1Name,
            player2: p2Name,
            mode: game.mode,
            score1: s1,
            score2: s2,
            winner: game.winner === game.player1 ? p1Name : p2Name,
            howOut: `Abandoned:${userEmail}`,
            gameType: game.gameType || 'handcricket'
        });
        await h.save();

        res.status(200).json("Game left");
    } catch (err) { res.status(500).json("Server error"); }
});

app.post("/select-toss-choice", async (req, res) => {
    try {
        const { gameId, userEmail, choice } = req.body;
        const game = await Game.findById(gameId);
        if(!game) return res.status(404).json("Game not found");
        game.toss.selectedBy = userEmail;
        game.toss.choice = choice;
        await game.save();
        res.status(200).json(game);
    } catch (err) { res.status(500).json("Server error"); }
});

app.post("/flip-coin", async (req, res) => {
    try {
        const { gameId } = req.body;
        const game = await Game.findById(gameId);
        if(!game) return res.status(404).json("Game not found");
        const isHead = Math.random() > 0.5;
        const result = isHead ? "head" : "tail";
        game.toss.result = result;
        if(game.toss.choice === result) {
            game.toss.winner = game.toss.selectedBy;
        } else {
            game.toss.winner = game.toss.selectedBy === game.player1 ? game.player2 : game.player1;
        }
        await game.save();
        res.status(200).json(game);
    } catch (err) { res.status(500).json("Server error"); }
});

app.post("/select-bat-bowl", async (req, res) => {
    try {
        const { gameId, decision } = req.body;
        const game = await Game.findById(gameId);
        if(!game) return res.status(404).json("Game not found");
        game.tossDecision = decision;
        game.tossCompleted = true;
        game.status = "playing";
        if(decision === "bat") game.currentTurn = game.toss.winner;
        else game.currentTurn = game.toss.winner === game.player1 ? game.player2 : game.player1;
        await game.save();
        res.status(200).json(game);
    } catch (err) { res.status(500).json("Server error"); }
});

app.post("/start-game", async (req, res) => {
    try {
        const { player1, player2, mode, gameType } = req.body;
        let currentTurn = player1;
        let status = "playing";
        let target = null;
        let initialState = {};

        const type = gameType || "handcricket";

        let playersList = [player1];
        if (player2) playersList.push(player2);

        if (type === "handcricket") {
            if (mode && mode.startsWith("bot_")) currentTurn = "Bot";
            if (mode === "bot_target") { currentTurn = player1; target = 50; }
        } else if (type === "hidden-number") {
            initialState = { p1Secret: null, p2Secret: null, p1Guesses: [], p2Guesses: [], turn: player1 };
            if(player2 === "Bot") initialState.p2Secret = Math.floor(Math.random() * 100);
        } else if (type === "rps" || type === "evenodd") {
            initialState = { p1Wins: 0, p2Wins: 0, rounds: [] };
        } else if (type === "tictactoe") {
            initialState = { board: Array(9).fill(null) };
            currentTurn = player1;
        } else if (type === "snake-ladders") {
            let pCount = req.body.playerCount || 2;
            playersList = [player1];
            for (let i = 1; i < pCount; i++) playersList.push("Bot" + i);
            initialState = { positions: {}, turnIndex: 0, lastDice: null };
            playersList.forEach(p => initialState.positions[p] = 1);
            currentTurn = playersList[0];
        } else if (type === "ludo") {
            let pCount = req.body.playerCount || 2;
            playersList = [player1];
            for (let i = 1; i < pCount; i++) playersList.push("Bot" + i);
            initialState = { tokens: {}, turnIndex: 0, lastDice: null, hasRolled: false };
            playersList.forEach(p => initialState.tokens[p] = [0,0,0,0]);
            currentTurn = playersList[0];
        } else if (type === "memory-flip") {
            let cards = [1,1,2,2,3,3,4,4,5,5,6,6,7,7,8,8];
            cards.sort(() => Math.random() - 0.5);
            initialState = { cards: cards.map(c => ({ id: c, flipped: false, matched: false })), scores: {}, turnIndex: 0, flippedIndexes: [] };
            playersList.forEach(p => initialState.scores[p] = 0);
            currentTurn = playersList[0];
        } else if (type === "memory-number") {
            let nums = [1,2,3,4,5,6,7,8,9];
            nums.sort(() => Math.random() - 0.5);
            initialState = { grid: nums, currentTarget: 1, turnIndex: 0, revealed: [] };
            currentTurn = playersList[0];
        }

        const newGame = new Game({
            player1, player2: playersList.length > 1 ? playersList[1] : null, 
            players: playersList,
            mode, currentTurn, status,
            target,
            gameType: type,
            gameState: initialState,
            isTossCompleted: false, // Toss needs to happen even with Bot
            lastPlay: { turnCount: 0 }
        });
        await newGame.save();
        res.status(200).json({ gameId: newGame._id });
    } catch (err) { res.status(500).json("Server error"); }
});

app.post("/complete-toss", async (req, res) => {
    try {
        const { gameId, tossWinner, tossChoice } = req.body;
        const game = await Game.findById(gameId);
        if(!game) return res.status(404).json("Game not found");
        
        game.tossWinner = tossWinner;
        game.tossChoice = tossChoice;
        game.isTossCompleted = true;
        game.status = "playing";
        
        // If winner chose bat, winner is batting. If bowl, opponent is batting.
        if(tossChoice === "bat") game.currentTurn = tossWinner;
        else game.currentTurn = (game.player1 === tossWinner ? game.player2 : game.player1);
        
        await game.save();
        res.status(200).json(game);
    } catch (err) { res.status(500).json("Server error"); }
});

app.get("/game/:id", async (req, res) => {
    try {
        const game = await Game.findById(req.params.id);
        if (!game) return res.status(404).json("Game not found");
        res.status(200).json(game);
    } catch (err) { res.status(500).json("Server error"); }
});

const generateBotMove = (game, playerMove) => {
    const m = game.mode;
    let botMove = Math.floor(Math.random() * 6) + 1;
    
    // Simple Smart Bot logic for different modes
    if (m === "bot_target" || m === "bot_defense") {
        // Tries to get OUT more often (matches player move chance)
        if(Math.random() < 0.3) botMove = playerMove;
    } else if (m === "bot_mind") {
        if(Math.random() < 0.4) botMove = playerMove; // adapts slightly
    }
    return botMove;
};

const saveHistory = async (game, winner, howOut) => {
    try {
        let p1Name = game.player1;
        let p2Name = game.player2;
        const u1 = await User.findOne({ email: game.player1 });
        if(u1) p1Name = u1.username;
        if(game.player2 !== 'Bot') {
            const u2 = await User.findOne({ email: game.player2 });
            if(u2) p2Name = u2.username;
        }
        
        let s1 = game.score1 || 0;
        let s2 = game.score2 || 0;

        if (game.gameType === 'rps' || game.gameType === 'evenodd') {
             s1 = game.gameState.p1Wins || 0;
             s2 = game.gameState.p2Wins || 0;
        } else if (game.gameType === 'hidden-number') {
             s1 = game.gameState.p1Guesses ? game.gameState.p1Guesses.length : 0;
             s2 = game.gameState.p2Guesses ? game.gameState.p2Guesses.length : 0;
        } else if (game.gameType === 'tictactoe') {
             s1 = 0; s2 = 0;
        }

        const h = new History({
            player1: p1Name,
            player2: p2Name,
            mode: game.mode,
            score1: s1,
            score2: s2,
            winner: winner === game.player1 ? p1Name : winner === game.player2 ? p2Name : "Draw",
            howOut,
            gameType: game.gameType || 'handcricket'
        });
        await h.save();
    } catch(e) { console.error(e) }
};

app.post("/play-live-turn", async (req, res) => {
    try {
        let { gameId, userEmail, move } = req.body;
        const game = await Game.findById(gameId);
        if (!game) return res.status(404).json("Game not found");
        if (game.status === "finished") return res.status(400).json({ error: "Game finished", game });

        if (userEmail === game.player1) game.p1Move = move;
        if (userEmail === game.player2) game.p2Move = move;

        await game.save();

        if (game.p1Move !== null && game.p2Move !== null) {
            let p1 = game.p1Move;
            let p2 = game.p2Move;
            let result = "";
            let runsToScore = 0;
            let howOut = "Caught / Bowled";

            const isP1Batting = (game.currentTurn === game.player1);
            
            // Timeout handling
            if (p1 === 'timeout' && p2 === 'timeout') {
                result = "runs"; runsToScore = 0; // both timed out
            } else if (p1 === 'timeout') {
                if (isP1Batting) { result = "OUT"; howOut = "Timed Out"; }
                else { result = "runs"; runsToScore = 6; } // p2 batting, p1 timed out -> p2 gets 6
            } else if (p2 === 'timeout') {
                if (!isP1Batting) { result = "OUT"; howOut = "Timed Out"; }
                else { result = "runs"; runsToScore = 6; } // p1 batting, p2 timed out -> p1 gets 6
            } else {
                // Normal logic
                // Modes adjustments
                const isRisk = game.mode === "bot_risk";
                const isReverse = game.mode === "bot_reverse";
                
                if (p1 === p2) {
                    if (isReverse) {
                        result = "runs"; runsToScore = p1 * 2; // Bonus
                    } else {
                        result = "OUT";
                    }
                } else {
                    if (isReverse) {
                        result = "runs"; runsToScore = 1; // Penalty
                    } else {
                        result = "runs";
                        runsToScore = isP1Batting ? p1 : p2;
                        if(isRisk && runsToScore > 3) runsToScore *= 2; // Risk multiplier
                    }
                }
            }

            game.balls += 1;

            if (result === "OUT") {
                if (game.innings === 1) {
                    game.innings = 2;
                    game.currentTurn = game.currentTurn === game.player1 ? game.player2 : game.player1;
                    game.balls = 0; // reset balls
                } else {
                    game.status = "finished";
                    if (game.score1 > game.score2) game.winner = game.player1;
                    else if (game.score2 > game.score1) game.winner = game.player2;
                    else game.winner = "Draw";
                    await saveHistory(game, game.winner, howOut);
                }
            } else {
                if (game.currentTurn === game.player1) {
                    game.score1 += runsToScore;
                    if ((game.innings === 2 && game.score1 > game.score2) || (game.target && game.score1 >= game.target)) {
                        game.status = "finished";
                        game.winner = game.player1;
                        await saveHistory(game, game.winner, "Chased Target");
                    }
                } else {
                    game.score2 += runsToScore;
                    if ((game.innings === 2 && game.score2 > game.score1) || (game.target && game.score2 >= game.target)) {
                        game.status = "finished";
                        game.winner = game.player2;
                        await saveHistory(game, game.winner, "Chased Target");
                    }
                }
            }
            
            const currentTurnCount = (game.lastPlay && game.lastPlay.turnCount) ? game.lastPlay.turnCount : 0;
            game.lastPlay = {
                p1, p2, result, runs: result === "runs" ? runsToScore : 0, turnCount: currentTurnCount + 1
            };

            game.p1Move = null;
            game.p2Move = null;
            await game.save();
        }

        res.status(200).json(game);
    } catch (err) {
        console.log(err);
        res.status(500).json("Server error");
    }
});

// =========================
// 🔥 NEW GAMES APIs
// =========================

app.post("/play-hidden-number", async (req, res) => {
    try {
        const { gameId, userEmail, move, type } = req.body; // type: 'set_secret' or 'guess'
        const game = await Game.findById(gameId);
        if (!game || game.status === "finished") return res.status(400).json("Invalid game");

        const amIP1 = game.player1 === userEmail;
        let gs = { ...game.gameState };

        if (type === "set_secret") {
            if (amIP1) gs.p1Secret = move; else gs.p2Secret = move;
        } else if (type === "guess") {
            if (gs.turn !== userEmail) return res.status(400).json("Not your turn");
            const target = amIP1 ? gs.p2Secret : gs.p1Secret;
            let result = "";
            if (move === target) {
                result = "Correct";
                game.status = "finished";
                game.winner = userEmail;
                await saveHistory(game, game.winner, "Found Secret Number");
            } else if (move > target) {
                result = "Lower";
            } else {
                result = "Higher";
            }
            
            if (amIP1) gs.p1Guesses.push({ guess: move, result });
            else gs.p2Guesses.push({ guess: move, result });

            if (game.status !== "finished") {
                gs.turn = amIP1 ? game.player2 : game.player1;
            }
        }
        
        game.gameState = gs;
        game.markModified('gameState');
        await game.save();
        res.status(200).json(game);
    } catch (err) { res.status(500).json("Server error"); }
});

app.post("/play-rps", async (req, res) => {
    try {
        const { gameId, userEmail, move } = req.body;
        const game = await Game.findById(gameId);
        if (!game || game.status === "finished") return res.status(400).json("Invalid game");

        if (game.player1 === userEmail) game.p1Move = move;
        if (game.player2 === userEmail) game.p2Move = move;

        if (game.p1Move && game.p2Move) {
            let gs = { ...game.gameState };
            let winner = null;
            const p1 = game.p1Move;
            const p2 = game.p2Move;

            if (p1 === p2) winner = "Draw";
            else if (
                (p1 === "rock" && p2 === "scissors") ||
                (p1 === "paper" && p2 === "rock") ||
                (p1 === "scissors" && p2 === "paper")
            ) { winner = game.player1; gs.p1Wins += 1; }
            else { winner = game.player2; gs.p2Wins += 1; }

            gs.rounds.push({ p1Move: p1, p2Move: p2, winner });

            if (gs.p1Wins >= 3) { game.status = "finished"; game.winner = game.player1; }
            else if (gs.p2Wins >= 3) { game.status = "finished"; game.winner = game.player2; }

            if (game.status === "finished") {
                await saveHistory(game, game.winner, "Best of 3 Won");
            }

            game.gameState = gs;
            game.p1Move = null;
            game.p2Move = null;
            game.markModified('gameState');
        }
        await game.save();
        res.status(200).json(game);
    } catch (err) { res.status(500).json("Server error"); }
});

app.post("/play-even-odd", async (req, res) => {
    try {
        const { gameId, userEmail, move, type } = req.body;
        const game = await Game.findById(gameId);
        if (!game || game.status === "finished") return res.status(400).json("Invalid game");

        let gs = { ...game.gameState };

        if (type === "select_role") {
            if (game.player1 === userEmail) {
                gs.p1Role = move;
                gs.p2Role = move === "Even" ? "Odd" : "Even";
                game.gameState = gs;
                game.markModified('gameState');
                await game.save();
                return res.status(200).json(game);
            }
        }

        if (game.player1 === userEmail) game.p1Move = move;
        if (game.player2 === userEmail) game.p2Move = move;

        if (game.p1Move && game.p2Move) {
            const sum = game.p1Move + game.p2Move;
            const isEven = sum % 2 === 0;
            
            let roundWinner;
            if (isEven) roundWinner = gs.p1Role === "Even" ? game.player1 : game.player2;
            else roundWinner = gs.p1Role === "Odd" ? game.player1 : game.player2;
            
            if (roundWinner === game.player1) gs.p1Wins += 1;
            else gs.p2Wins += 1;

            gs.rounds.push({ p1Move: game.p1Move, p2Move: game.p2Move, sum, roundWinner });

            if (gs.p1Wins >= 3) { game.status = "finished"; game.winner = game.player1; }
            else if (gs.p2Wins >= 3) { game.status = "finished"; game.winner = game.player2; }

            if (game.status === "finished") {
                await saveHistory(game, game.winner, "Best of 3 Won");
            }

            game.gameState = gs;
            game.p1Move = null;
            game.p2Move = null;
            game.markModified('gameState');
        }
        await game.save();
        res.status(200).json(game);
    } catch (err) { res.status(500).json("Server error"); }
});

app.post("/play-tictactoe", async (req, res) => {
    try {
        const { gameId, userEmail, move } = req.body; // move is index 0-8
        const game = await Game.findById(gameId);
        if (!game || game.status === "finished") return res.status(400).json("Invalid game");
        if (game.currentTurn !== userEmail) return res.status(400).json("Not your turn");

        let gs = { ...game.gameState };
        if (gs.board[move]) return res.status(400).json("Spot taken");

        const symbol = game.player1 === userEmail ? "X" : "O";
        gs.board[move] = symbol;

        const winPatterns = [
            [0,1,2],[3,4,5],[6,7,8], // rows
            [0,3,6],[1,4,7],[2,5,8], // cols
            [0,4,8],[2,4,6] // diag
        ];

        let hasWon = false;
        for (let pattern of winPatterns) {
            const [a, b, c] = pattern;
            if (gs.board[a] && gs.board[a] === gs.board[b] && gs.board[a] === gs.board[c]) {
                hasWon = true; break;
            }
        }

        if (hasWon) {
            game.status = "finished";
            game.winner = userEmail;
        } else if (!gs.board.includes(null)) {
            game.status = "finished";
            game.winner = "Draw";
        } else {
            game.currentTurn = game.player1 === userEmail ? game.player2 : game.player1;
        }

        if (game.status === "finished") {
            await saveHistory(game, game.winner, hasWon ? "Three in a row" : "Draw");
        }

        game.gameState = gs;
        game.markModified('gameState');
        await game.save();
        res.status(200).json(game);
    } catch (err) { res.status(500).json("Server error"); }
});
app.post("/play-snake-ladders", async (req, res) => {
    try {
        const { gameId, userEmail, diceValue } = req.body;
        const game = await Game.findById(gameId);
        if (!game || game.status === "finished") return res.status(400).json("Invalid game");
        if (game.currentTurn !== userEmail) return res.status(400).json("Not your turn");

        let gs = { ...game.gameState };
        
        let currentPos = gs.positions[userEmail];
        let newPos = currentPos + diceValue;
        
        let intermediate = null;
        if (newPos <= 100) {
            // Let's use standard ladders and snakes
            const ls = {
                // Ladders
                4:25, 21:39, 26:67, 43:76, 59:80, 71:89,
                // Snakes
                30:8, 47:13, 56:19, 73:51, 82:42, 92:75, 98:55
            };
            if (ls[newPos]) {
                intermediate = newPos;
                newPos = ls[newPos];
            }
            gs.positions[userEmail] = newPos;
        }

        gs.lastDice = { player: userEmail, value: diceValue, intermediate };

        if (gs.positions[userEmail] === 100) {
            game.status = "finished";
            game.winner = userEmail;
            await saveHistory(game, game.winner, "Reached 100");
        } else {
            if (diceValue !== 6) {
                let currentIdx = game.players.indexOf(userEmail);
                let nextIdx = (currentIdx + 1) % game.players.length;
                game.currentTurn = game.players[nextIdx];
            }
        }

        game.gameState = gs;
        game.markModified('gameState');
        await game.save();
        res.status(200).json(game);
    } catch (err) { res.status(500).json("Server error"); }
});

app.post("/play-ludo", async (req, res) => {
    try {
        const { gameId, userEmail, action, diceValue, tokenIndex } = req.body;
        const game = await Game.findById(gameId);
        if (!game || game.status === "finished") return res.status(400).json("Invalid game");
        if (game.currentTurn !== userEmail) return res.status(400).json("Not your turn");

        let gs = { ...game.gameState };

        if (action === "roll") {
            if (gs.hasRolled) return res.status(400).json("Already rolled");
            gs.lastDice = { player: userEmail, value: diceValue };
            gs.hasRolled = true;

            // Check if any valid moves
            let tokens = gs.tokens[userEmail];
            let canMove = false;
            for(let i=0; i<4; i++) {
                if (tokens[i] === 0 && diceValue === 6) canMove = true;
                if (tokens[i] > 0 && tokens[i] + diceValue <= 57) canMove = true;
            }
            if (!canMove) {
                gs.hasRolled = false;
                let currentIdx = game.players.indexOf(userEmail);
                game.currentTurn = game.players[(currentIdx + 1) % game.players.length];
            }
        } else if (action === "move") {
            if (!gs.hasRolled) return res.status(400).json("Need to roll first");
            let tokens = gs.tokens[userEmail];
            let val = gs.lastDice.value;
            let currentPos = tokens[tokenIndex];
            
            let capturedOpponent = false;
            let pIdx = game.players.indexOf(userEmail);
            let startIndexes = [0, 13, 26, 39];
            let safeZones = [0, 8, 13, 21, 26, 34, 39, 47];

            if (currentPos === 0 && val === 6) {
                tokens[tokenIndex] = 1;
            } else if (currentPos > 0 && currentPos + val <= 57) {
                tokens[tokenIndex] = currentPos + val;
                
                // Collision check
                let newPos = tokens[tokenIndex];
                if (newPos >= 1 && newPos <= 51) {
                    let myGlobalIdx = (startIndexes[pIdx] + newPos - 1) % 52;
                    if (!safeZones.includes(myGlobalIdx)) {
                        // Check other players
                        game.players.forEach((oppEmail, oppIdx) => {
                            if (oppIdx !== pIdx) {
                                let oppTokens = gs.tokens[oppEmail];
                                for (let i = 0; i < 4; i++) {
                                    let oppPos = oppTokens[i];
                                    if (oppPos >= 1 && oppPos <= 51) {
                                        let oppGlobalIdx = (startIndexes[oppIdx] + oppPos - 1) % 52;
                                        if (oppGlobalIdx === myGlobalIdx) {
                                            // Capture!
                                            oppTokens[i] = 0;
                                            capturedOpponent = true;
                                        }
                                    }
                                }
                            }
                        });
                    }
                }
            } else {
                return res.status(400).json("Invalid move");
            }
            
            let won = tokens.every(t => t === 57);
            if (won) {
                game.status = "finished";
                game.winner = userEmail;
                await saveHistory(game, game.winner, "Ludo Won");
            } else {
                gs.hasRolled = false;
                if (val !== 6 && !capturedOpponent) {
                    let currentIdx = game.players.indexOf(userEmail);
                    game.currentTurn = game.players[(currentIdx + 1) % game.players.length];
                }
            }
        }

        game.gameState = gs;
        game.markModified('gameState');
        await game.save();
        res.status(200).json(game);
    } catch (err) { res.status(500).json("Server error"); }
});

app.post("/play-memory-flip", async (req, res) => {
    try {
        const { gameId, userEmail, index } = req.body;
        const game = await Game.findById(gameId);
        if (!game || game.status === "finished") return res.status(400).json("Invalid game");
        if (game.currentTurn !== userEmail) return res.status(400).json("Not your turn");

        let gs = { ...game.gameState };
        
        if (gs.flippedIndexes.length >= 2 || gs.cards[index].flipped || gs.cards[index].matched) {
            return res.status(400).json("Invalid flip");
        }

        gs.cards[index].flipped = true;
        gs.flippedIndexes.push(index);

        if (gs.flippedIndexes.length === 2) {
            const [idx1, idx2] = gs.flippedIndexes;
            if (gs.cards[idx1].id === gs.cards[idx2].id) {
                // Match
                gs.cards[idx1].matched = true;
                gs.cards[idx2].matched = true;
                gs.scores[userEmail] += 1;
                gs.flippedIndexes = []; // they get another turn immediately? Or just keep it as their turn.
                // It is their turn still
            } else {
                // No match, handled by a separate end_turn call or timeout?
                // Actually, the client should show the flip, wait a bit, then call another endpoint or we handle it here and tell client it's a mismatch.
                // We'll just set it here. The client will see flippedIndexes length 2 and show them, then call /end-memory-flip-turn
            }
        }

        // Check if all matched
        let allMatched = gs.cards.every(c => c.matched);
        if (allMatched) {
            game.status = "finished";
            // find highest score
            let maxScore = -1;
            let winner = null;
            let draw = false;
            Object.keys(gs.scores).forEach(p => {
                if (gs.scores[p] > maxScore) { maxScore = gs.scores[p]; winner = p; draw = false; }
                else if (gs.scores[p] === maxScore) { draw = true; }
            });
            game.winner = draw ? "Draw" : winner;
            await saveHistory(game, game.winner, "Highest Score");
        }

        game.gameState = gs;
        game.markModified('gameState');
        await game.save();
        res.status(200).json(game);
    } catch (err) { res.status(500).json("Server error"); }
});

app.post("/end-memory-flip-turn", async (req, res) => {
    try {
        const { gameId, userEmail } = req.body;
        const game = await Game.findById(gameId);
        if (!game || game.status === "finished") return res.status(400).json("Invalid game");
        if (game.currentTurn !== userEmail) return res.status(400).json("Not your turn");

        let gs = { ...game.gameState };
        if (gs.flippedIndexes.length === 2) {
            const [idx1, idx2] = gs.flippedIndexes;
            gs.cards[idx1].flipped = false;
            gs.cards[idx2].flipped = false;
            gs.flippedIndexes = [];
            
            let currentIdx = game.players.indexOf(userEmail);
            game.currentTurn = game.players[(currentIdx + 1) % game.players.length];
            
            game.gameState = gs;
            game.markModified('gameState');
            await game.save();
        }
        res.status(200).json(game);
    } catch (err) { res.status(500).json("Server error"); }
});

app.post("/play-memory-number", async (req, res) => {
    try {
        const { gameId, userEmail, index } = req.body;
        const game = await Game.findById(gameId);
        if (!game || game.status === "finished") return res.status(400).json("Invalid game");
        if (game.currentTurn !== userEmail) return res.status(400).json("Not your turn");

        let gs = { ...game.gameState };
        let clickedNumber = gs.grid[index];

        if (clickedNumber === gs.currentTarget) {
            gs.revealed.push(index);
            gs.currentTarget++;
            if (gs.currentTarget > 9) {
                game.status = "finished";
                game.winner = userEmail;
                await saveHistory(game, game.winner, "Completed Sequence");
            }
        } else {
            // Wrong guess
            if (game.status !== "finished") {
                gs.currentTarget = 1;
                gs.revealed = [];
                let currentIdx = game.players.indexOf(userEmail);
                game.currentTurn = game.players[(currentIdx + 1) % game.players.length];
            }
        }

        game.gameState = gs;
        game.markModified('gameState');
        await game.save();
        res.status(200).json(game);
    } catch (err) { res.status(500).json("Server error"); }
});

app.get("/history/:email", async (req, res) => {
    try {
        const u = await User.findOne({ email: req.params.email });
        if(!u) return res.status(404).json("User not found");
        const hist = await History.find({ 
            $or: [{ player1: u.username }, { player2: u.username }] 
        }).sort({ date: -1 });
        res.status(200).json(hist);
    } catch (err) { res.status(500).json("Server error"); }
});

app.post("/request-rematch", async (req, res) => {
    try {
        const { gameId, userEmail } = req.body;
        const game = await Game.findById(gameId);
        if(!game) return res.status(404).json("Game not found");
        game.rematchRequestedBy = userEmail;
        game.rematchDeclined = false;
        await game.save();
        res.status(200).json(game);
    } catch (err) { res.status(500).json("Server error"); }
});

app.post("/accept-rematch", async (req, res) => {
    try {
        const { gameId, userEmail } = req.body;
        const oldGame = await Game.findById(gameId);
        if(!oldGame) return res.status(404).json("Game not found");
        
        let initialState = {};
        let initialStatus = "toss";
        let initialTurn = null;

        if (oldGame.gameType === "hidden-number") {
            initialStatus = "playing";
            initialState = { p1Secret: null, p2Secret: null, p1Guesses: [], p2Guesses: [], turn: oldGame.player1 };
        } else if (oldGame.gameType === "rps") {
            initialStatus = "playing";
            initialState = { p1Wins: 0, p2Wins: 0, rounds: [] };
        } else if (oldGame.gameType === "evenodd") {
            initialStatus = "playing";
            initialState = { p1Wins: 0, p2Wins: 0, rounds: [] };
        } else if (oldGame.gameType === "tictactoe") {
            initialStatus = "playing";
            initialTurn = oldGame.player1;
            initialState = { board: Array(9).fill(null) };
        } else if (oldGame.gameType === "snake-ladders") {
            initialStatus = "playing";
            initialState = { positions: {}, turnIndex: 0, lastDice: null };
            oldGame.players.forEach(p => initialState.positions[p] = 1);
            initialTurn = oldGame.players[0];
        } else if (oldGame.gameType === "ludo") {
            initialStatus = "playing";
            initialState = { tokens: {}, turnIndex: 0, lastDice: null, hasRolled: false };
            oldGame.players.forEach(p => initialState.tokens[p] = [0,0,0,0]);
            initialTurn = oldGame.players[0];
        } else if (oldGame.gameType === "memory-flip") {
            initialStatus = "playing";
            let cards = [1,1,2,2,3,3,4,4,5,5,6,6,7,7,8,8];
            cards.sort(() => Math.random() - 0.5);
            initialState = { cards: cards.map(c => ({ id: c, flipped: false, matched: false })), scores: {}, turnIndex: 0, flippedIndexes: [] };
            oldGame.players.forEach(p => initialState.scores[p] = 0);
            initialTurn = oldGame.players[0];
        } else if (oldGame.gameType === "memory-number") {
            initialStatus = "playing";
            let nums = [1,2,3,4,5,6,7,8,9];
            nums.sort(() => Math.random() - 0.5);
            initialState = { grid: nums, currentTarget: 1, turnIndex: 0, revealed: [] };
            initialTurn = oldGame.players[0];
        }

        const newGame = new Game({
            player1: oldGame.player1,
            player2: oldGame.player2,
            gameType: oldGame.gameType,
            gameState: initialState,
            mode: oldGame.mode,
            status: initialStatus,
            currentTurn: initialTurn,
            lastPlay: { turnCount: 0 }
        });
        await newGame.save();
        oldGame.rematchGameId = newGame._id;
        await oldGame.save();
        res.status(200).json({ gameId: newGame._id });
    } catch (err) { res.status(500).json("Server error"); }
});

app.post("/decline-rematch", async (req, res) => {
    try {
        const { gameId } = req.body;
        const game = await Game.findById(gameId);
        if(!game) return res.status(404).json("Game not found");
        game.rematchDeclined = true;
        await game.save();
        res.status(200).json(game);
    } catch (err) { res.status(500).json("Server error"); }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});