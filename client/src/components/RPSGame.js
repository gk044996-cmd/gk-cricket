import React, { useState, useEffect, useRef, useCallback } from 'react';
import { getGame, playRPS } from '../api';
import './GameScreen.css';

const RPSGame = ({ gameId, userEmail, username, onExit }) => {
    const [game, setGame] = useState(null);
    const [loading, setLoading] = useState(true);
    const [countdown, setCountdown] = useState(0);
    const [localMove, setLocalMove] = useState(null);
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
                const choices = ["rock", "paper", "scissors"];
                const botMove = choices[Math.floor(Math.random() * 3)];
                playRPS({ gameId, userEmail: "Bot", move: botMove }).then(loadGame);
            }, 700);
            return () => clearTimeout(timer);
        }
    }, [game, gameId, userEmail, loadGame]);

    if (loading || !game) return <div className="game-loading">Loading RPS...</div>;

    const amIP1 = game.player1 === userEmail;
    const gs = game.gameState || { p1Wins: 0, p2Wins: 0, rounds: [] };
    const myWins = amIP1 ? gs.p1Wins : gs.p2Wins;
    const oppWins = amIP1 ? gs.p2Wins : gs.p1Wins;
    const opponentEmail = amIP1 ? game.player2 : game.player1;
    const opponentName = opponentEmail.split('@')[0];
    const isFinished = game.status === 'finished';
    const myMove = amIP1 ? game.p1Move : game.p2Move;

    const handlePlay = async (move) => {
        if (myMove || localMove || isFinished) return;
        setLocalMove(move);
        setCountdown(3);
        let count = 3;
        const timer = setInterval(() => {
            count--;
            setCountdown(count);
            if(count === 0) {
                clearInterval(timer);
                playRPS({ gameId, userEmail, move }).then(() => {
                    setLocalMove(null);
                    loadGame();
                });
            }
        }, 800);
    };

    return (
        <div className="game-screen glass-card">
            <button className="exit-btn" onClick={onExit}>⬅ Leave Game</button>
            <h2 className="vs-title">{username} <span className="vs-badge">VS</span> {opponentName}</h2>
            <div className="mode-badge">ROCK PAPER SCISSORS (Best of 5)</div>

            {countdown > 0 && (
                <div className="anim-countdown">{countdown}</div>
            )}

            <div className="scoreboard">
                <div className="score-card">
                    <h3>You</h3>
                    <p className="score">{myWins}</p>
                </div>
                <div className="score-card">
                    <h3>{opponentName}</h3>
                    <p className="score">{oppWins}</p>
                </div>
            </div>

            {!isFinished && (
                <div className="action-area text-center mt-4">
                    {myMove || localMove ? (
                        <p className="waiting-text">⏳ Waiting for {opponentName} to choose...</p>
                    ) : (
                        <div>
                            <h4>Choose your weapon</h4>
                            <div style={{ display: 'flex', justifyContent: 'center', gap: '15px', marginTop: '15px' }}>
                                <button className="primary-btn" style={{ width: 'auto', fontSize: '24px' }} onClick={() => handlePlay('rock')}>✊ Rock</button>
                                <button className="primary-btn" style={{ width: 'auto', fontSize: '24px', background: '#29b6f6' }} onClick={() => handlePlay('paper')}>✋ Paper</button>
                                <button className="primary-btn" style={{ width: 'auto', fontSize: '24px', background: '#ab47bc' }} onClick={() => handlePlay('scissors')}>✌️ Scissors</button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            <div className="mt-4">
                <h4 className="text-center">Rounds History</h4>
                <ul style={{ listStyle: 'none', padding: 0 }}>
                    {gs.rounds.map((r, i) => {
                        const m1 = amIP1 ? r.p1Move : r.p2Move;
                        const m2 = amIP1 ? r.p2Move : r.p1Move;
                        const resultText = r.winner === "Draw" ? "Draw" : (r.winner === userEmail ? "You won!" : "Opponent won");
                        const getEmoji = (m) => m === 'rock' ? '✊' : m === 'paper' ? '✋' : '✌️';
                        return (
                            <li key={i} style={{ background: 'rgba(0,0,0,0.2)', padding: '10px', borderRadius: '8px', marginBottom: '8px', textAlign: 'center' }}>
                                Round {i+1}: You (<span className="anim-hand">{getEmoji(m1)}</span>) vs {opponentName} (<span className="anim-hand">{getEmoji(m2)}</span>) ➔ {resultText}
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

export default RPSGame;
