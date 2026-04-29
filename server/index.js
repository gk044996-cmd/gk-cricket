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
        const users = await User.find({ email: { $ne: req.params.email } }).select("username email isOnline lastSeen friends");
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
        res.status(200).json(user.friends);
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

app.post("/accept-game-invite", async (req, res) => {
    try {
        const { userEmail, requesterEmail, gameType } = req.body;
        const user = await User.findOne({ email: userEmail });
        const requester = await User.findOne({ email: requesterEmail });
        if (!user || !requester) return res.status(404).json("User not found");
        
        user.gameInvites = user.gameInvites.filter(i => !(i.requester.toString() === requester._id.toString() && i.gameType === gameType));
        await user.save();

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
            user.gameInvites = user.gameInvites.filter(i => !(i.requester.toString() === requester._id.toString() && i.gameType === gameType));
            await user.save();
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
            gameType: i.gameType
        })));
    } catch (err) { res.status(500).json("Server error"); }
});

app.get("/active-game/:email", async (req, res) => {
    try {
        const game = await Game.findOne({
            $or: [{ player1: req.params.email }, { player2: req.params.email }],
            status: { $in: ["toss", "toss_selection", "playing"] }
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
        game.howOut = "Forfeit";
        await game.save();

        const p1Name = game.player1 === "Bot" ? "Bot" : await User.findOne({ email: game.player1 }).then(u => u.username);
        const p2Name = game.player2 === "Bot" ? "Bot" : await User.findOne({ email: game.player2 }).then(u => u.username);
        
        const h = new History({
            date: new Date().toLocaleDateString(),
            player1: p1Name,
            player2: p2Name,
            mode: game.mode,
            score1: game.score1 || 0,
            score2: game.score2 || 0,
            winner: game.winner === game.player1 ? p1Name : p2Name,
            howOut: "Forfeit"
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
        }

        const newGame = new Game({
            player1, player2, mode, currentTurn, status,
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
        
        const h = new History({
            player1: p1Name,
            player2: p2Name,
            mode: game.mode,
            score1: game.score1,
            score2: game.score2,
            winner: winner === game.player1 ? p1Name : winner === game.player2 ? p2Name : "Draw",
            howOut
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

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});