import React, { useState, useEffect } from "react";
import { getGame, playSnakeLadders, requestRematch, acceptRematch, declineRematch } from "../api";
import "./SnakeLaddersGame.css";



const COLORS = ["#f44336", "#2196f3", "#4caf50", "#ffeb3b"];

const SnakeLaddersGame = ({ gameId, userEmail, username, onExit, onPlayAgainBot }) => {
    const getDisplayName = (email) => {
        if (!email) return "Unknown";
        if (email === userEmail) return username || "You";
        if (email.startsWith("Bot")) return email;
        return email.split('@')[0];
    };

    const [game, setGame] = useState(null);
    const [diceVal, setDiceVal] = useState(1);
    const [isRolling, setIsRolling] = useState(false);
    const [displayPositions, setDisplayPositions] = useState({});

    const loadGame = async () => {
        try {
            const data = await getGame(gameId);
            if (data && data._id) setGame(data);
        } catch (e) { }
    };

    useEffect(() => {
        loadGame();
        const intv = setInterval(loadGame, 3000);
        return () => clearInterval(intv);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [gameId]);

    const targetPosTracker = React.useRef({});

    useEffect(() => {
        if (!game) return;
        const actualPos = game.gameState?.positions || {};
        const last = game.gameState?.lastDice;
        
        let newDisplay = { ...displayPositions };
        let needUpdate = false;
        
        Object.keys(actualPos).forEach(p => {
            if (!displayPositions[p]) {
                newDisplay[p] = actualPos[p];
                targetPosTracker.current[p] = actualPos[p];
                needUpdate = true;
            } else if (displayPositions[p] !== actualPos[p] && targetPosTracker.current[p] !== actualPos[p]) {
                targetPosTracker.current[p] = actualPos[p];
                const targetWalk = (last && last.player === p && last.intermediate) ? last.intermediate : actualPos[p];
                const finalPos = actualPos[p];
                let current = displayPositions[p];
                
                if (current < targetWalk) {
                    const walk = async () => {
                        for (let i = current + 1; i <= targetWalk; i++) {
                            setDisplayPositions(prev => ({ ...prev, [p]: i }));
                            await new Promise(r => setTimeout(r, 300)); // 300ms per step
                        }
                        if (targetWalk !== finalPos) {
                            await new Promise(r => setTimeout(r, 500)); // brief pause before climbing/sliding
                            setDisplayPositions(prev => ({ ...prev, [p]: finalPos }));
                        }
                    };
                    walk();
                } else {
                    newDisplay[p] = finalPos;
                    needUpdate = true;
                }
            }
        });
        if (needUpdate) setDisplayPositions(newDisplay);

        if (game.status === 'playing' && game.currentTurn?.startsWith("Bot") && game.mode !== 'friend') {
            if (game.player1 === userEmail) {
                const triggerBot = async () => {
                    await new Promise(r => setTimeout(r, 2000)); // Give time for animations to finish before bot rolls
                    const v = Math.floor(Math.random() * 6) + 1;
                    setIsRolling(true);
                    let rolls = 0;
                    const rollInterval = setInterval(() => {
                        setDiceVal(Math.floor(Math.random() * 6) + 1);
                        rolls++;
                        if (rolls > 10) {
                            clearInterval(rollInterval);
                            setDiceVal(v);
                            setTimeout(async () => {
                                setIsRolling(false);
                                await playSnakeLadders({ gameId, userEmail: game.currentTurn, diceValue: v });
                                loadGame();
                            }, 400);
                        }
                    }, 80);
                };
                triggerBot();
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [game]);

    const handleRoll = async () => {
        if (isRolling || game.currentTurn !== userEmail) return;
        setIsRolling(true);
        const v = Math.floor(Math.random() * 6) + 1;
        
        let rolls = 0;
        const rollInterval = setInterval(() => {
            setDiceVal(Math.floor(Math.random() * 6) + 1);
            rolls++;
            if (rolls > 10) {
                clearInterval(rollInterval);
                setDiceVal(v);
                setTimeout(async () => {
                    setIsRolling(false);
                    await playSnakeLadders({ gameId, userEmail, diceValue: v });
                    loadGame();
                }, 400);
            }
        }, 80);
    };

    if (!game) return <div className="loading">Loading Game...</div>;

    const getCoords = (pos) => {
        if (!pos) pos = 1;
        let p = pos - 1;
        let row = Math.floor(p / 10);
        let col = p % 10;
        if (row % 2 !== 0) col = 9 - col;
        return { x: col * 10 + 5, y: 90 - row * 10 + 5 };
    };

    const renderBoard = () => {
        const cells = [];
        for (let i = 100; i >= 1; i--) {
            let row = Math.floor((100 - i) / 10);
            let col = (100 - i) % 10;
            let displayNum = i;
            if (row % 2 !== 0) displayNum = 100 - (row * 10) - (9 - col);

            cells.push(
                <div key={displayNum} className="board-cell">
                    <span className="cell-num">{displayNum}</span>
                </div>
            );
        }

        const tokens = (game.players || []).map((p, idx) => {
            const pos = displayPositions[p] || 1;
            const coords = getCoords(pos);
            return (
                <div key={p} className="token absolute-token" style={{
                    backgroundColor: COLORS[idx],
                    left: `calc(${coords.x}% - 12px)`, // offset by half width (token is 24px)
                    top: `calc(${coords.y}% - 12px)`,
                    position: 'absolute',
                    width: '24px', height: '24px', borderRadius: '50%',
                    border: '3px solid white', boxShadow: '0 4px 10px rgba(0,0,0,0.5)',
                    transition: 'all 0.8s cubic-bezier(0.4, 0, 0.2, 1)', zIndex: 10
                }}></div>
            );
        });

        return (
            <div style={{position: 'relative', width: '100%', height: '100%'}}>
                <div className="snake-board-grid" style={{
                    display: 'grid', gridTemplateColumns: 'repeat(10, 1fr)', gridTemplateRows: 'repeat(10, 1fr)', 
                    width: '100%', height: '100%', gap: '0px', background: 'transparent'
                }}>
                    {cells}
                </div>
                {tokens}
            </div>
        );
    };

    const isMyTurn = game.currentTurn === userEmail;

    if (game.status === 'finished') {
        const opponentName = getDisplayName(game.players.find(p => p !== userEmail));
        
        return (
            <div className="container center-container">
                <div className="winner-popup">
                    <h2>Game Over!</h2>
                    {game.howOut && game.howOut.startsWith('Abandoned') ? (
                        <>
                            <h3 style={{color: '#ffeb3b', margin: '15px 0'}}>{game.howOut.split(':')[1] !== userEmail ? `${opponentName} left the game` : 'You left the game'}</h3>
                            <div className="flex-row mt-3" style={{display: 'flex', gap: '10px', justifyContent: 'center'}}>
                                <button className="exit-btn-standard" onClick={() => onExit(true)} style={{background: '#d32f2f', padding: '10px 20px', borderRadius: '8px', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 'bold'}}>🚪 Exit Game</button>
                            </div>
                        </>
                    ) : (
                        <>
                            <p>Winner: <strong>{game.winner === userEmail ? "You! 🎉" : (game.winner === "Draw" ? "Draw 🤝" : `${getDisplayName(game.winner)} 😔`)}</strong></p>
                            
                            {game.mode === 'friend' && game.rematchRequestedBy && game.rematchRequestedBy !== userEmail && !game.rematchGameId && !game.rematchDeclined && (
                                <div className="rematch-request mt-3 p-3" style={{background: 'rgba(255,255,255,0.1)', borderRadius: '10px'}}>
                                    <p className="mb-2"><strong>{getDisplayName(game.rematchRequestedBy)}</strong> wants to play again!</p>
                                    <div className="flex-row" style={{display: 'flex', gap: '10px', justifyContent: 'center'}}>
                                        <button className="primary-btn" onClick={async () => { await acceptRematch({gameId: game._id, userEmail}); onExit(true); }}>Accept</button>
                                        <button className="reject-btn" onClick={async () => { await declineRematch({gameId: game._id}); }}>Reject</button>
                                    </div>
                                </div>
                            )}

                            {game.mode === 'friend' && game.rematchRequestedBy === userEmail && !game.rematchDeclined && !game.rematchGameId && (
                                <p className="mt-3">⏳ Waiting for opponent to accept...</p>
                            )}

                            {game.mode === 'friend' && game.rematchDeclined && game.rematchRequestedBy === userEmail && (
                                <p className="error-text mt-3" style={{color: '#ff4d4d'}}>Opponent declined the rematch.</p>
                            )}

                            {!game.rematchRequestedBy && (
                                <div className="flex-row mt-3" style={{display: 'flex', gap: '10px', justifyContent: 'center'}}>
                                    {game.mode === 'friend' ? (
                                        <button className="primary-btn" onClick={async () => { await requestRematch({gameId: game._id, userEmail}); loadGame(); }}>🔁 Play Again</button>
                                    ) : (
                                        <button className="primary-btn" onClick={() => onPlayAgainBot(game.mode, game.gameType)}>🔁 Play Again</button>
                                    )}
                                    <button className="exit-btn-standard" onClick={() => onExit(true)} style={{background: '#d32f2f', padding: '10px 20px', borderRadius: '8px', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 'bold'}}>🚪 Exit Game</button>
                                </div>
                            )}
                            
                            {game.rematchDeclined && (
                                <div className="flex-row mt-3" style={{display: 'flex', gap: '10px', justifyContent: 'center'}}>
                                    <button className="exit-btn-standard" onClick={() => onExit(true)} style={{background: '#d32f2f', padding: '10px 20px', borderRadius: '8px', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 'bold'}}>🚪 Exit Game</button>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="game-container snake-container">
            <div className="game-header">
                <button className="exit-btn" onClick={() => onExit(false)}>⬅ Leave Game</button>
                <h2>🐍 Snake & Ladders</h2>
                <div className="turn-indicator">
                    {isMyTurn ? "Your Turn!" : `${getDisplayName(game.currentTurn)}'s Turn`}
                </div>
            </div>

            <div className="players-hud">
                {(game.players || []).map((p, i) => (
                    <div key={p} className={`player-badge ${game.currentTurn === p ? 'active' : ''}`} style={{borderColor: COLORS[i]}}>
                        <span className="dot" style={{backgroundColor: COLORS[i]}}></span>
                        {getDisplayName(p)} (Pos: {game.gameState?.positions?.[p] || 0})
                    </div>
                ))}
            </div>

            <div className="board-wrapper">
                <div className="snake-board" style={{ backgroundImage: `url('https://img.freepik.com/premium-vector/snakes-ladders-board-game-template-children_600323-3076.jpg')` }}>
                    {renderBoard()}
                </div>
            </div>

            <div className="controls">
                <div className={`dice ${isRolling ? 'rolling' : ''}`}>{diceVal}</div>
                <button className="primary-btn roll-btn" onClick={handleRoll} disabled={!isMyTurn || isRolling}>
                    {isRolling ? "Rolling..." : "Roll Dice 🎲"}
                </button>
            </div>
            {game.gameState?.lastDice && (
                <div className="last-move-toast">
                    {game.gameState.lastDice.player} rolled a {game.gameState.lastDice.value}!
                </div>
            )}
        </div>
    );
};

export default SnakeLaddersGame;
