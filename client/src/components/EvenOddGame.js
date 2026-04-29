import React, { useState, useEffect, useRef, useCallback } from 'react';
import { getGame, playEvenOdd } from '../api';
import './GameScreen.css';

const EvenOddGame = ({ gameId, userEmail, username, onExit }) => {
    const [game, setGame] = useState(null);
    const [loading, setLoading] = useState(true);
    const [makingMove, setMakingMove] = useState(false);
    const isPolling = useRef(true);

    const loadGame = useCallback(async () => {
        if (!isPolling.current) return;
        try {
            const data = await getGame(gameId);
            setGame(data);
            setLoading(false);
        } catch (e) { console.error(e); }
    }, [gameId]);

    useEffect(() => {
        loadGame();
        const interval = setInterval(loadGame, 2000);
        return () => clearInterval(interval);
    }, [loadGame]);

    useEffect(() => {
        if (!game) return;
        const amIP1 = game.player1 === userEmail;
        const opponentEmail = amIP1 ? game.player2 : game.player1;
        const isFinished = game.status === 'finished';
        const myMove = amIP1 ? game.p1Move : game.p2Move;
        const oppMove = amIP1 ? game.p2Move : game.p1Move;
        const botNeedsToPlay = opponentEmail === "Bot" && myMove && !oppMove && !isFinished;

        if (botNeedsToPlay) {
            console.log("Turn: bot");
            console.log("Bot move triggered");
            const timer = setTimeout(() => {
                const botMove = Math.floor(Math.random() * 6) + 1;
                playEvenOdd({ gameId, userEmail: "Bot", move: botMove, type: 'play' }).then(loadGame);
            }, 700);
            return () => clearTimeout(timer);
        }
    }, [game, gameId, userEmail, loadGame]);

    if (loading || !game) return <div className="game-loading">Loading Even-Odd...</div>;

    const amIP1 = game.player1 === userEmail;
    const gs = game.gameState || { p1Wins: 0, p2Wins: 0, rounds: [] };
    const myWins = amIP1 ? (gs.p1Wins || 0) : (gs.p2Wins || 0);
    const oppWins = amIP1 ? (gs.p2Wins || 0) : (gs.p1Wins || 0);
    const opponentEmail = amIP1 ? game.player2 : game.player1;
    const opponentName = opponentEmail.split('@')[0];
    const isFinished = game.status === 'finished';
    
    const myMove = amIP1 ? game.p1Move : game.p2Move;
    const myRole = amIP1 ? gs.p1Role : gs.p2Role;
    const oppRole = amIP1 ? gs.p2Role : gs.p1Role;

    const handleSelectRole = async (role) => {
        if (makingMove) return;
        setMakingMove(true);
        setGame(prev => ({ ...prev, gameState: { ...prev.gameState, p1Role: role, p2Role: role === "Even" ? "Odd" : "Even" } }));
        try {
            await playEvenOdd({ gameId, userEmail, move: role, type: 'select_role' });
            await loadGame();
        } finally { setMakingMove(false); }
    };

    const handlePlay = async (num) => {
        if (myMove || isFinished || makingMove) return;
        setMakingMove(true);
        
        // Optimistic
        const key = amIP1 ? 'p1Move' : 'p2Move';
        setGame(prev => ({ ...prev, [key]: num }));

        try {
            await playEvenOdd({ gameId, userEmail, move: num, type: 'play' });
            await loadGame();
        } finally { setMakingMove(false); }
    };

    if (!gs.p1Role) {
        return (
            <div className="game-screen glass-card">
                <button className="exit-btn" onClick={onExit}>⬅ Leave Game</button>
                <h2 className="vs-title">{username} <span className="vs-badge">VS</span> {opponentName}</h2>
                <div className="mode-badge">EVEN-ODD BATTLE</div>
                <div className="action-area text-center mt-5">
                    <h3>Role Selection</h3>
                    {amIP1 ? (
                        <div>
                            <p>You are Player 1! Choose your role for this match:</p>
                            <button className="primary-btn m-2" onClick={() => handleSelectRole("Even")}>Even</button>
                            <button className="primary-btn m-2" onClick={() => handleSelectRole("Odd")}>Odd</button>
                        </div>
                    ) : (
                        <p>⏳ Waiting for {game.player1.split('@')[0]} to choose Even or Odd...</p>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="game-screen glass-card">
            <button className="exit-btn" onClick={onExit}>⬅ Leave Game</button>
            <h2 className="vs-title">{username} <span className="vs-badge">VS</span> {opponentName}</h2>
            <div className="mode-badge">EVEN-ODD BATTLE (Best of 5)</div>

            <div className="text-center mt-2 mb-3">
                <p><strong>Rules:</strong> You are {myRole}. {opponentName} is {oppRole}. Choose 1-6!</p>
            </div>

            <div className="scoreboard">
                <div className="score-card">
                    <h3>You ({myRole})</h3>
                    <p className="score">{myWins}</p>
                </div>
                <div className="score-card">
                    <h3>{opponentName} ({oppRole})</h3>
                    <p className="score">{oppWins}</p>
                </div>
            </div>

            {!isFinished && (
                <div className="action-area text-center mt-4">
                    {myMove ? (
                        <p className="waiting-text">⏳ Waiting for {opponentName} to choose...</p>
                    ) : (
                        <div>
                            <h4>Choose your number</h4>
                            <div className="buttons-grid" style={{ maxWidth: '300px', margin: '15px auto' }}>
                                {[1, 2, 3, 4, 5, 6].map(num => (
                                    <button 
                                        key={num} 
                                        className="play-btn"
                                        onClick={() => handlePlay(num)}
                                    >
                                        {num}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            <div className="mt-4">
                <h4 className="text-center">Rounds History</h4>
                <ul style={{ listStyle: 'none', padding: 0 }}>
                    {(gs.rounds || []).map((r, i) => {
                        const m1 = amIP1 ? r.p1Move : r.p2Move;
                        const m2 = amIP1 ? r.p2Move : r.p1Move;
                        const resultText = r.roundWinner === userEmail ? "You won!" : "Opponent won";
                        return (
                            <li key={i} style={{ background: 'rgba(0,0,0,0.2)', padding: '10px', borderRadius: '8px', marginBottom: '8px', textAlign: 'center' }}>
                                Round {i+1}: You (<span className="anim-dice">🎲</span> <strong>{m1}</strong>) + Opp (<span className="anim-dice">🎲</span> <strong>{m2}</strong>) = <strong>{r.sum}</strong> ➔ {resultText}
                            </li>
                        );
                    })}
                </ul>
            </div>

            {isFinished && (
                <div className="winner-popup">
                    <h2>Game Over!</h2>
                    <p>Winner: <strong>{game.winner === userEmail ? "You! 🎉" : `${opponentName} 😔`}</strong></p>
                    <button className="primary-btn mt-3" onClick={onExit}>Return to Dashboard</button>
                </div>
            )}
        </div>
    );
};

export default EvenOddGame;
