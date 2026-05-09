import React, { useState, useEffect, useRef, useCallback } from 'react';
import { getGame, playLiveTurn, requestRematch, acceptRematch, declineRematch } from '../api';
import TurnTimer from './TurnTimer';
import { playSound } from './AudioSystem';
import './GameScreen.css';

const GameScreen = ({ gameId, userEmail, username, onExit, onPlayAgainBot, equipped }) => {
    const getDisplayName = (email) => {
        if (!email) return "Unknown";
        if (email === userEmail) return username || "You";
        if (email.startsWith("Bot")) return email;
        return email.split('@')[0];
    };

    const [game, setGame] = useState(null);
    const [loading, setLoading] = useState(true);

    // Animation states
    const [animating, setAnimating] = useState(false);
    const [showBall, setShowBall] = useState(false);
    const [showBat, setShowBat] = useState(false);
    const [resultAnim, setResultAnim] = useState(null);
    const [lastMoveDisp, setLastMoveDisp] = useState(null);



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
                        if (isOut) playSound('out');
                        else playSound('hit');

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
    const opponentEmail = amIP1 ? game?.player2 : game?.player1;
    const isBot = opponentEmail === "Bot";

    const myName = getDisplayName(userEmail);
    const opponentName = getDisplayName(opponentEmail);
    const myMoveSelected = game ? (amIP1 ? game.p1Move !== null : game.p2Move !== null) : false;
    const botMoveSelected = game ? (amIP1 ? game.p2Move !== null : game.p1Move !== null) : false;

    useEffect(() => {
        if (!game || !isBot || game.status !== 'playing' || animating) return;
        if (!botMoveSelected) {
            console.log("Turn: bot");
            console.log("Bot move triggered");
            const timer = setTimeout(() => {
                const botNumber = Math.floor(Math.random() * 6) + 1;
                playLiveTurn({ gameId, userEmail: "Bot", move: botNumber }).then(loadGame);
            }, 800);
            return () => clearTimeout(timer);
        }
    }, [game, isBot, botMoveSelected, animating, gameId, loadGame]);

    const handlePlay = useCallback(async (move) => {
        if (!game || game.status === "finished" || animating) return;
        if (myMoveSelected) return;

        setShowBat(true);
        setTimeout(() => setShowBat(false), 300);

        await playLiveTurn({ gameId, userEmail, move });
        loadGame();
    }, [game, animating, myMoveSelected, gameId, userEmail, loadGame]);

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

    if (loading || !game) return <div className="game-loading">Loading Match...</div>;

    const isFinished = game.status === "finished";

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
            {!isFinished && (
                <button className="exit-btn" onClick={() => onExit(false)}>⬅ Leave Game</button>
            )}
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
                    <TurnTimer isActive={true} onTimeout={() => handlePlay('timeout')} duration={10} />
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
                {showBall && <div className={`ball-anim anim-ball ${equipped?.ballEffect || ''}`}>🎾</div>}
                {showBat && <div className={`bat-anim anim-bat ${equipped?.batEffect || ''}`}>🏏</div>}
                {resultAnim && (
                    <div className={`result-popup ${resultAnim === 'OUT!' ? (equipped?.outEffect || 'out-popup') : 'runs-popup'}`}>
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
                <div className={`winner-popup ${(game.winner === userEmail) ? (equipped?.winEffect || '') : ''}`} style={{ position: 'relative', overflow: 'hidden' }}>
                    <h2>Game Over!</h2>
                    {game.howOut && game.howOut.startsWith('Abandoned') ? (
                        <>
                            <h3 style={{ color: '#ffeb3b', margin: '15px 0' }}>{game.howOut.split(':')[1] === opponentEmail ? `${opponentName} left the game` : 'You left the game'}</h3>
                            <div className="flex-row mt-3" style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                                <button className="exit-btn" onClick={() => onExit(true)} style={{ background: '#d32f2f' }}>🚪 Exit Game</button>
                            </div>
                        </>
                    ) : (
                        <>
                            <p>Winner: <strong>{game.winner === userEmail ? "You! 🎉" : game.winner === opponentEmail ? `${opponentName} 😔` : "Draw 🤝"}</strong></p>
                            <p>Final Score: {myScore} - {opponentScore}</p>

                            {game.rematchRequestedBy && game.rematchRequestedBy !== userEmail && !game.rematchGameId && !game.rematchDeclined && (
                                <div className="rematch-request mt-3 p-3" style={{ background: 'rgba(255,255,255,0.1)', borderRadius: '10px' }}>
                                    <p className="mb-2"><strong>{getDisplayName(game.rematchRequestedBy)}</strong> wants to play again!</p>
                                    <div className="flex-row" style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                                        <button className="primary-btn" onClick={handleAcceptRematch}>Accept</button>
                                        <button className="reject-btn" onClick={handleDeclineRematch}>Reject</button>
                                    </div>
                                </div>
                            )}

                            {game.rematchRequestedBy === userEmail && !game.rematchDeclined && !game.rematchGameId && (
                                <p className="mt-3">⏳ Waiting for opponent to accept...</p>
                            )}

                            {game.rematchDeclined && game.rematchRequestedBy === userEmail && (
                                <p className="error-text mt-3" style={{ color: '#ff4d4d' }}>Opponent declined the rematch.</p>
                            )}

                            {!game.rematchRequestedBy && (
                                <div className="flex-row mt-3" style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                                    <button className="primary-btn" onClick={handlePlayAgain}>🔁 Play Again</button>
                                    <button className="exit-btn" onClick={() => onExit(true)} style={{ background: '#d32f2f' }}>🚪 Exit Game</button>
                                </div>
                            )}

                            {game.rematchDeclined && (
                                <div className="flex-row mt-3" style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                                    <button className="exit-btn" onClick={() => onExit(true)} style={{ background: '#d32f2f' }}>🚪 Exit Game</button>
                                </div>
                            )}
                        </>
                    )}
                </div>
            )}
        </div>
    );
};

export default GameScreen;
