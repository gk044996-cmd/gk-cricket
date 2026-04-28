import React, { useState, useEffect, useRef, useCallback } from 'react';
import { getGame, playLiveTurn, completeToss } from '../api';
import './GameScreen.css';

const GameScreen = ({ gameId, userEmail, username, onExit }) => {
    const [game, setGame] = useState(null);
    const [loading, setLoading] = useState(true);
    
    // Animation states
    const [animating, setAnimating] = useState(false);
    const [showBall, setShowBall] = useState(false);
    const [showBat, setShowBat] = useState(false);
    const [resultAnim, setResultAnim] = useState(null);
    const [lastMoveDisp, setLastMoveDisp] = useState(null);
    const [tossAnimating, setTossAnimating] = useState(false);

    // Timer state
    const [timeLeft, setTimeLeft] = useState(5);

    const prevTurnCount = useRef(0);
    const isPolling = useRef(true);

    const loadGame = useCallback(async () => {
        if (!isPolling.current) return;
        
        try {
            const data = await getGame(gameId);
            
            if (data.lastPlay && data.lastPlay.turnCount > prevTurnCount.current) {
                isPolling.current = false;
                setAnimating(true);
                setShowBall(true);

                setTimeout(() => {
                    setShowBall(false);
                    setShowBat(true);
                    
                    setTimeout(() => {
                        setShowBat(false);
                        
                        const isOut = data.lastPlay.result === "OUT";
                        setResultAnim(isOut ? "OUT!" : `+${data.lastPlay.runs}`);
                        setLastMoveDisp({
                            p1: data.lastPlay.p1,
                            p2: data.lastPlay.p2
                        });
                        
                        setGame(data);
                        prevTurnCount.current = data.lastPlay.turnCount;

                        setTimeout(() => {
                            setResultAnim(null);
                            setAnimating(false);
                            isPolling.current = true;
                            setTimeLeft(5); // Reset timer after animation
                        }, 1500);

                    }, 500);
                }, 1500);

            } else {
                if (!animating) {
                    setGame(data);
                    if (data.lastPlay) prevTurnCount.current = data.lastPlay.turnCount;
                }
            }
            
            setLoading(false);
        } catch (e) { console.error(e); }
    }, [gameId, animating]);

    useEffect(() => {
        loadGame();
        const interval = setInterval(loadGame, 2000);
        return () => clearInterval(interval);
    }, [loadGame]);

    const amIP1 = game?.player1 === userEmail;
    const myMoveSelected = game ? (amIP1 ? game.p1Move !== null : game.p2Move !== null) : false;

    const handlePlay = useCallback(async (move) => {
        if (!game || game.status === "finished" || animating) return;
        if (myMoveSelected) return;

        setShowBat(true);
        setTimeout(() => setShowBat(false), 300);

        await playLiveTurn({ gameId, userEmail, move });
        loadGame();
    }, [game, animating, myMoveSelected, gameId, userEmail, loadGame]);

    // Auto Turn Timer Logic
    useEffect(() => {
        if (game && game.status === 'playing' && !animating && !myMoveSelected) {
            const timer = setInterval(() => {
                setTimeLeft(prev => {
                    if (prev <= 1) {
                        clearInterval(timer);
                        handlePlay('timeout'); // Auto-submit timeout
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
            return () => clearInterval(timer);
        } else {
            setTimeLeft(5);
        }
    }, [game, animating, myMoveSelected, handlePlay]);

    const handleToss = async (choice) => {
        // Player 1 handles toss
        setTossAnimating(true);
        setTimeout(async () => {
            const isP1Winner = Math.random() > 0.5;
            const tossWinner = isP1Winner ? game.player1 : game.player2;
            let tossChoice = choice;
            
            if (!isP1Winner) {
                tossChoice = Math.random() > 0.5 ? 'bat' : 'bowl'; // opponent random choice
            }

            await completeToss({ gameId, tossWinner, tossChoice });
            setTossAnimating(false);
            loadGame();
        }, 2000);
    };

    if (loading || !game) return <div className="game-loading">Loading Match...</div>;

    const isFinished = game.status === "finished";
    const myName = username;
    const opponentEmail = amIP1 ? game.player2 : game.player1;
    const opponentName = opponentEmail === 'Bot' ? 'Bot 🤖' : opponentEmail.split('@')[0];

    // TOSS SCREEN
    if (game.status === "toss") {
        return (
            <div className="game-screen glass-card">
                <h2>🎲 Match Toss</h2>
                <div className="toss-area">
                    {tossAnimating ? (
                        <div className="coin-flip-anim">🪙</div>
                    ) : (
                        amIP1 ? (
                            <div className="toss-controls">
                                <p>You are Player 1! Choose what you want if you win the toss:</p>
                                <button className="primary-btn m-2" onClick={() => handleToss('bat')}>Bat 🏏</button>
                                <button className="primary-btn m-2" onClick={() => handleToss('bowl')}>Bowl 🎯</button>
                            </div>
                        ) : (
                            <div className="toss-controls">
                                <p>Waiting for {opponentName} to flip the coin... ⏳</p>
                            </div>
                        )
                    )}
                </div>
            </div>
        );
    }

    const myScore = amIP1 ? game.score1 : game.score2;
    const opponentScore = amIP1 ? game.score2 : game.score1;

    const myTurnStatus = game.currentTurn === userEmail;
    const opponentTurnStatus = game.currentTurn === opponentEmail;

    const oppMoveSelected = amIP1 ? game.p2Move !== null : game.p1Move !== null;

    let waitingText = "";
    if (!isFinished && !animating) {
        if (myMoveSelected && !oppMoveSelected) waitingText = "⏳ Waiting for opponent...";
        else if (!myMoveSelected && oppMoveSelected) waitingText = "⚠️ Opponent is ready! Your turn!";
        else if (!myMoveSelected && !oppMoveSelected) waitingText = "Your turn to select.";
    }

    return (
        <div className="game-screen glass-card">
            <button className="exit-btn" onClick={onExit}>⬅ Leave Game</button>
            <h2 className="vs-title">{myName} <span className="vs-badge">VS</span> {opponentName}</h2>
            <div className="mode-badge">{game.mode.replace('bot_', '').toUpperCase()}</div>

            <div className="scoreboard">
                <div className={`score-card ${myTurnStatus ? 'active-turn' : ''}`}>
                    <h3>You</h3>
                    <p className="score">{myScore}</p>
                    {myTurnStatus && <span className="batting-badge">🏏 Batting</span>}
                </div>
                <div className="innings-info">
                    <p>Innings {game.innings}</p>
                    <p>Balls: {game.balls}</p>
                    {game.target && <p className="target-text">Target: {game.target}</p>}
                </div>
                <div className={`score-card ${opponentTurnStatus ? 'active-turn' : ''}`}>
                    <h3>{opponentName}</h3>
                    <p className="score">{opponentScore}</p>
                    {opponentTurnStatus && <span className="batting-badge">🏏 Batting</span>}
                </div>
            </div>

            <div className="status-display">
                {!isFinished && !animating && !myMoveSelected && (
                    <div className="timer-box">
                        <span className="timer-icon">⏳</span> {timeLeft}s
                    </div>
                )}
                <p className="waiting-text">{waitingText}</p>
                
                {lastMoveDisp && !animating && (
                    <div className="last-moves">
                        <div className="move-box">You: <span>{amIP1 ? lastMoveDisp.p1 : lastMoveDisp.p2}</span></div>
                        <div className="move-box">Opp: <span>{amIP1 ? lastMoveDisp.p2 : lastMoveDisp.p1}</span></div>
                    </div>
                )}
            </div>

            {/* ANIMATIONS */}
            <div className="animation-container">
                {showBall && <div className="ball-anim">🎾</div>}
                {showBat && <div className="bat-anim">🏏</div>}
                {resultAnim && (
                    <div className={`result-popup ${resultAnim === 'OUT!' ? 'out-popup' : 'runs-popup'}`}>
                        {resultAnim}
                    </div>
                )}
            </div>

            {!isFinished && (
                <div className="controls">
                    <div className="buttons-grid">
                        {[1, 2, 3, 4, 5, 6].map(num => (
                            <button 
                                key={num} 
                                className={`play-btn ${myMoveSelected ? 'disabled' : ''}`}
                                onClick={() => handlePlay(num)}
                                disabled={myMoveSelected || animating}
                            >
                                {num}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {isFinished && !animating && (
                <div className="winner-popup">
                    <h2>Game Over!</h2>
                    <p>Winner: <strong>{game.winner === userEmail ? "You! 🎉" : game.winner === opponentEmail ? `${opponentName} 😔` : "Draw 🤝"}</strong></p>
                    <button className="primary-btn mt-3" onClick={onExit}>Return to Dashboard</button>
                </div>
            )}
        </div>
    );
};

export default GameScreen;
