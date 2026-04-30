import React, { useState, useEffect, useRef, useCallback } from 'react';
import { getGame, playRPS, requestRematch, acceptRematch, declineRematch } from '../api';
import './GameScreen.css';

const RPSGame = ({ gameId, userEmail, username, onExit, onPlayAgainBot }) => {
    const getDisplayName = (email) => {
        if (!email) return "Unknown";
        if (email === userEmail) return username || "You";
        if (email.startsWith("Bot")) return email;
        return email.split('@')[0];
    };

    const [game, setGame] = useState(null);
    const [loading, setLoading] = useState(true);
    const [animatingRound, setAnimatingRound] = useState(null);
    const [shuffleEmoji, setShuffleEmoji] = useState('✊');
    const [showResult, setShowResult] = useState(null);
    const isPolling = useRef(true);
    const prevRoundsCount = useRef(0);

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

    useEffect(() => {
        if (!game) return;
        const gs = game.gameState || { rounds: [] };
        if (gs.rounds.length > prevRoundsCount.current) {
            const newRound = gs.rounds[gs.rounds.length - 1];
            prevRoundsCount.current = gs.rounds.length;
            
            setAnimatingRound(newRound);
            setShowResult(null);

            let emojis = ['✊', '✋', '✌️'];
            let i = 0;
            const interval = setInterval(() => {
                setShuffleEmoji(emojis[i % 3]);
                i++;
            }, 100);

            setTimeout(() => {
                clearInterval(interval);
                setShowResult(newRound);
                setTimeout(() => {
                    setAnimatingRound(null);
                    setShowResult(null);
                }, 2000);
            }, 2000);
        }
    }, [game]);

    const amIP1 = game?.player1 === userEmail;
    const opponentEmail = game ? (amIP1 ? game.player2 : game.player1) : "";
    const isBot = opponentEmail === "Bot";

    const handlePlayAgain = async () => {
        if (isBot) {
            onPlayAgainBot(game.mode, game.gameType);
        } else {
            await requestRematch({ gameId, userEmail });
            loadGame();
        }
    };

    const handleAcceptRematch = async () => {
        await acceptRematch({ gameId, userEmail });
    };

    const handleDeclineRematch = async () => {
        await declineRematch({ gameId });
        loadGame();
    };

    if (loading || !game) return <div className="game-loading">Loading RPS...</div>;

    const gs = game.gameState || { p1Wins: 0, p2Wins: 0, rounds: [] };
    const myWins = amIP1 ? gs.p1Wins : gs.p2Wins;
    const oppWins = amIP1 ? gs.p2Wins : gs.p1Wins;
    const opponentName = getDisplayName(opponentEmail);
    const isFinished = game.status === 'finished';
    const myMove = amIP1 ? game.p1Move : game.p2Move;

    const handlePlay = async (move) => {
        if (myMove || isFinished || animatingRound) return;
        await playRPS({ gameId, userEmail, move });
        loadGame();
    };

    const getEmoji = (m) => m === 'rock' ? '✊' : m === 'paper' ? '✋' : '✌️';

    return (
        <div className="game-screen glass-card">
            {!isFinished && (
                <button className="exit-btn" onClick={() => onExit(false)}>⬅ Leave Game</button>
            )}
            <h2 className="vs-title">{username} <span className="vs-badge">VS</span> {opponentName}</h2>
            <div className="mode-badge">ROCK PAPER SCISSORS (Best of 5)</div>

            <div className="scoreboard">
                <div className="score-card">
                    <h3>You</h3>
                    <p className="score">{animatingRound && !showResult && myWins > 0 && animatingRound.winner === userEmail ? myWins - 1 : myWins}</p>
                </div>
                <div className="score-card">
                    <h3>{opponentName}</h3>
                    <p className="score">{animatingRound && !showResult && oppWins > 0 && animatingRound.winner !== userEmail && animatingRound.winner !== "Draw" ? oppWins - 1 : oppWins}</p>
                </div>
            </div>

            {animatingRound && (
                <div className="action-area text-center mt-4 glass-card" style={{ padding: '20px', background: 'rgba(255,255,255,0.1)' }}>
                    <h3 className="mb-3 text-warning">Rock, Paper, Scissors...</h3>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '30px', fontSize: '60px' }}>
                        <div className="player-anim-box">
                            <div style={{ fontSize: '18px', fontWeight: 'bold' }}>You</div>
                            <div className={showResult ? "bounce-in" : ""}>{showResult ? getEmoji(amIP1 ? animatingRound.p1Move : animatingRound.p2Move) : shuffleEmoji}</div>
                        </div>
                        <div style={{ alignSelf: 'center', fontSize: '30px', fontWeight: 'bold' }}>VS</div>
                        <div className="player-anim-box">
                            <div style={{ fontSize: '18px', fontWeight: 'bold' }}>{opponentName}</div>
                            <div className={showResult ? "bounce-in" : ""}>{showResult ? getEmoji(amIP1 ? animatingRound.p2Move : animatingRound.p1Move) : shuffleEmoji}</div>
                        </div>
                    </div>
                    {showResult && (
                        <h2 className="mt-3 text-success bounce-in" style={{ fontSize: '32px' }}>
                            {showResult.winner === "Draw" ? "It's a Draw!" : showResult.winner === userEmail ? "You Won!" : `${opponentName} Won!`}
                        </h2>
                    )}
                </div>
            )}

            {!isFinished && !animatingRound && (
                <div className="action-area text-center mt-4">
                    {myMove ? (
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
                    {gs.rounds.filter((r) => r !== animatingRound).map((r, i) => {
                        const m1 = amIP1 ? r.p1Move : r.p2Move;
                        const m2 = amIP1 ? r.p2Move : r.p1Move;
                        const resultText = r.winner === "Draw" ? "Draw" : (r.winner === userEmail ? "You won!" : "Opponent won");
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
                    {game.howOut && game.howOut.startsWith('Abandoned') ? (
                        <>
                            <h3 style={{color: '#ffeb3b', margin: '15px 0'}}>{game.howOut.split(':')[1] === opponentEmail ? `${opponentName} left the game` : 'You left the game'}</h3>
                            <div className="flex-row mt-3" style={{display: 'flex', gap: '10px', justifyContent: 'center'}}>
                                <button className="exit-btn" onClick={() => onExit(true)} style={{background: '#d32f2f'}}>🚪 Exit Game</button>
                            </div>
                        </>
                    ) : (
                        <>
                            <p>Winner: <strong>{game.winner === userEmail ? "You! 🎉" : `${opponentName} 😔`}</strong></p>
                            
                            {game.rematchRequestedBy && game.rematchRequestedBy !== userEmail && !game.rematchGameId && !game.rematchDeclined && (
                                <div className="rematch-request mt-3 p-3" style={{background: 'rgba(255,255,255,0.1)', borderRadius: '10px'}}>
                                    <p className="mb-2"><strong>{getDisplayName(game.rematchRequestedBy)}</strong> wants to play again!</p>
                                    <div className="flex-row" style={{display: 'flex', gap: '10px', justifyContent: 'center'}}>
                                        <button className="primary-btn" onClick={handleAcceptRematch}>Accept</button>
                                        <button className="reject-btn" onClick={handleDeclineRematch}>Reject</button>
                                    </div>
                                </div>
                            )}

                            {game.rematchRequestedBy === userEmail && !game.rematchDeclined && !game.rematchGameId && (
                                <p className="mt-3">⏳ Waiting for opponent to accept...</p>
                            )}

                            {game.rematchDeclined && game.rematchRequestedBy === userEmail && (
                                <p className="error-text mt-3" style={{color: '#ff4d4d'}}>Opponent declined the rematch.</p>
                            )}

                            {!game.rematchRequestedBy && (
                                <div className="flex-row mt-3" style={{display: 'flex', gap: '10px', justifyContent: 'center'}}>
                                    <button className="primary-btn" onClick={handlePlayAgain}>🔁 Play Again</button>
                                    <button className="exit-btn" onClick={() => onExit(true)} style={{background: '#d32f2f'}}>🚪 Exit Game</button>
                                </div>
                            )}
                            
                            {game.rematchDeclined && (
                                <div className="flex-row mt-3" style={{display: 'flex', gap: '10px', justifyContent: 'center'}}>
                                    <button className="exit-btn" onClick={() => onExit(true)} style={{background: '#d32f2f'}}>🚪 Exit Game</button>
                                </div>
                            )}
                        </>
                    )}
                </div>
            )}
        </div>
    );
};

export default RPSGame;
