import React, { useState, useEffect } from "react";
import { getGame, playLudo, requestRematch, acceptRematch, declineRematch } from "../api";
import TurnTimer from "./TurnTimer";
import { playSound } from "./AudioSystem";
import "./LudoGame.css";

const COLORS = ["#4caf50", "#ffeb3b", "#2196f3", "#f44336"];

const globalPath = [
    [1,6], [2,6], [3,6], [4,6], [5,6],
    [6,5], [6,4], [6,3], [6,2], [6,1], [6,0],
    [7,0], [8,0],
    [8,1], [8,2], [8,3], [8,4], [8,5],
    [9,6], [10,6], [11,6], [12,6], [13,6], [14,6],
    [14,7], [14,8],
    [13,8], [12,8], [11,8], [10,8], [9,8],
    [8,9], [8,10], [8,11], [8,12], [8,13], [8,14],
    [7,14], [6,14],
    [6,13], [6,12], [6,11], [6,10], [6,9],
    [5,8], [4,8], [3,8], [2,8], [1,8], [0,8],
    [0,7], [0,6]
];

const homeStretches = [
    [[1,7], [2,7], [3,7], [4,7], [5,7]],
    [[7,1], [7,2], [7,3], [7,4], [7,5]],
    [[13,7], [12,7], [11,7], [10,7], [9,7]],
    [[7,13], [7,12], [7,11], [7,10], [7,9]]
];

const homePositions = [
    [6.5,7], [7,6.5], [7.5,7], [7,7.5]
];

const basePositions = [
    [[1.65, 1.65], [3.35, 1.65], [1.65, 3.35], [3.35, 3.35]],
    [[10.65, 1.65], [12.35, 1.65], [10.65, 3.35], [12.35, 3.35]],
    [[10.65, 10.65], [12.35, 10.65], [10.65, 12.35], [12.35, 12.35]],
    [[1.65, 10.65], [3.35, 10.65], [1.65, 12.35], [3.35, 12.35]]
];

const startIndexes = [0, 13, 26, 39];

const LudoGame = ({ gameId, userEmail, username, onExit, onPlayAgainBot, equipped }) => {
    const getDisplayName = (email) => {
        if (!email) return "Unknown";
        if (email === userEmail) return username || "You";
        if (email.startsWith("Bot")) return email;
        return email.split('@')[0];
    };

    const [game, setGame] = useState(null);
    const [diceVal, setDiceVal] = useState(1);
    const [isRolling, setIsRolling] = useState(false);
    const [visualTokens, setVisualTokens] = useState({});
    const [isAnimating, setIsAnimating] = useState(false);

    const loadGame = async () => {
        try {
            const data = await getGame(gameId);
            if (data && data._id) setGame(data);
        } catch (e) {}
    };

    useEffect(() => {
        if (game?.gameState?.tokens) {
            const actualTokens = game.gameState.tokens;
            if (Object.keys(visualTokens).length === 0) {
                setVisualTokens(actualTokens);
            } else {
                let hasDifference = false;
                let nextVisual = { ...visualTokens };
                
                Object.keys(actualTokens).forEach(pEmail => {
                    if (!nextVisual[pEmail]) nextVisual[pEmail] = [...actualTokens[pEmail]];
                    for (let i = 0; i < 4; i++) {
                        const targetPos = actualTokens[pEmail][i];
                        const currentPos = nextVisual[pEmail][i];
                        
                        if (targetPos !== currentPos) {
                            hasDifference = true;
                            if (targetPos === 0) {
                                nextVisual[pEmail][i] = 0; // killed
                            } else if (currentPos === 0 && targetPos === 1) {
                                nextVisual[pEmail][i] = 1; // move out of base
                            } else if (currentPos < targetPos) {
                                nextVisual[pEmail][i] = currentPos + 1; // forward step
                            } else {
                                nextVisual[pEmail][i] = targetPos; // fallback
                            }
                        }
                    }
                });
                
                if (hasDifference) {
                    setIsAnimating(true);
                    const timer = setTimeout(() => {
                        setVisualTokens(nextVisual);
                    }, 200); // 200ms per step
                    return () => clearTimeout(timer);
                } else {
                    setIsAnimating(false);
                }
            }
        }
    }, [game?.gameState?.tokens, visualTokens]);

    useEffect(() => {
        loadGame();
        const intv = setInterval(loadGame, 3000);
        return () => clearInterval(intv);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [gameId]);

    useEffect(() => {
        if (!game) return;
        if (game.status === 'playing' && game.currentTurn?.startsWith("Bot") && game.mode !== 'friend') {
            if (game.player1 === userEmail) {
                const triggerBot = async () => {
                    if (isRolling) return;
                    
                    if (!game.gameState?.hasRolled) {
                        const v = Math.floor(Math.random() * 6) + 1;
                        setDiceVal(v);
                        setIsRolling(true);
                        
                        setTimeout(async () => {
                            setIsRolling(false);
                            await playLudo({ gameId, userEmail: game.currentTurn, action: "roll", diceValue: v });
                            loadGame();
                        }, 800);
                    } else {
                        await new Promise(r => setTimeout(r, 1000));
                        // bot needs to move
                        let tokens = game.gameState.tokens[game.currentTurn];
                        let val = game.gameState.lastDice.value;
                        let movable = [];
                        for(let i=0; i<4; i++) {
                            if (tokens[i] === 0 && val === 6) movable.push(i);
                            else if (tokens[i] > 0 && tokens[i] + val <= 57) movable.push(i);
                        }
                        if (movable.length > 0) {
                            let pick = movable[Math.floor(Math.random() * movable.length)];
                            await playLudo({ gameId, userEmail: game.currentTurn, action: "move", tokenIndex: pick });
                            loadGame();
                        }
                    }
                };
                triggerBot();
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [game, isRolling]);

    const handleRoll = async () => {
        if (isRolling || game.currentTurn !== userEmail || game.gameState?.hasRolled) return;
        setIsRolling(true);
        playSound('roll');
        const v = Math.floor(Math.random() * 6) + 1;
        setDiceVal(v);
        
        setTimeout(async () => {
            setIsRolling(false);
            await playLudo({ gameId, userEmail, action: "roll", diceValue: v });
            loadGame();
        }, 800);
    };

    const handleMove = async (tokenIndex) => {
        if (game.currentTurn !== userEmail || !game.gameState?.hasRolled) return;
        // Don't move if still animating
        if (isAnimating) return;
        playSound('move');
        
        await playLudo({ gameId, userEmail, action: "move", tokenIndex });
        loadGame();
    };

    if (!game) return <div className="loading">Loading Game...</div>;

    const isMyTurn = game.currentTurn === userEmail;

    if (game.status === 'finished') {
        const opponentName = getDisplayName(game.players.find(p => p !== userEmail));
        const amIWinner = game.winner === userEmail;
        return (
            <div className="container center-container">
                <div className={`winner-popup ${amIWinner ? (equipped?.winEffect || '') : ''}`} style={{position: 'relative', overflow: 'hidden'}}>
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

    const allTokensData = [];
    const tokensToRender = Object.keys(visualTokens).length > 0 ? visualTokens : game?.gameState?.tokens;

    if (game && game.players && tokensToRender) {
        game.players.forEach((pEmail, pIdx) => {
            (tokensToRender[pEmail] || []).forEach((pos, tIdx) => {
                let x, y;
                if (pos === 0) {
                    [x, y] = basePositions[pIdx][tIdx];
                } else if (pos >= 1 && pos <= 51) {
                    let globalIdx = (startIndexes[pIdx] + pos - 1) % 52;
                    [x, y] = globalPath[globalIdx];
                } else if (pos >= 52 && pos <= 56) {
                    let homeIdx = pos - 52;
                    [x, y] = homeStretches[pIdx][homeIdx];
                } else {
                    [x, y] = homePositions[pIdx];
                }
                allTokensData.push({ pEmail, pIdx, tIdx, pos, x, y });
            });
        });

        allTokensData.forEach(t => {
            if (t.pos !== 0 && t.pos !== 57) {
                let samePosTokens = allTokensData.filter(other => other.x === t.x && other.y === t.y);
                t.offsetIdx = samePosTokens.indexOf(t);
                t.totalAtPos = samePosTokens.length;
            } else {
                t.offsetIdx = 0;
                t.totalAtPos = 1;
            }
        });
    }

    const canRoll = isMyTurn && !isRolling && !game.gameState?.hasRolled && !isAnimating;

    return (
        <div className="game-container ludo-container">
            <div className="game-header">
                <button className="exit-btn" onClick={() => onExit(false)}>⬅ Leave Game</button>
                <h2>🎲 Ludo</h2>
                <div className={`turn-indicator ${isMyTurn ? 'your-turn' : 'bot-turn'}`}>
                    {isMyTurn ? "🟢 YOUR TURN" : `🔴 ${getDisplayName(game.currentTurn).toUpperCase()}'S TURN`}
                </div>
            </div>

            {game.status === 'playing' && (
                <TurnTimer isActive={isMyTurn && !isRolling && !isAnimating} onTimeout={() => {
                    playLudo({ gameId, userEmail, action: 'timeout' }).then(loadGame);
                }} duration={10} />
            )}

            <div className="players-hud">
                {(game.players || []).map((p, i) => (
                    <div key={p} className={`player-badge ${game.currentTurn === p ? 'active' : ''}`} style={{borderColor: COLORS[i]}}>
                        <span className="dot" style={{backgroundColor: COLORS[i]}}></span>
                        {getDisplayName(p)}
                    </div>
                ))}
            </div>

            <div className="ludo-board-wrapper">
                <div className="ludo-board-image-container">
                    {allTokensData.map((t, idx) => {
                        let leftPercent = (t.x / 15) * 100;
                        let topPercent = (t.y / 15) * 100;
                        
                        if (t.totalAtPos > 1) {
                            let offset = (t.offsetIdx - (t.totalAtPos - 1) / 2) * 2;
                            leftPercent += offset;
                            topPercent += offset;
                        }

                        const actualPos = game.gameState?.tokens?.[t.pEmail]?.[t.tIdx];
                        const isClickable = isMyTurn && t.pEmail === userEmail && game.gameState?.hasRolled && actualPos === t.pos;
                        
                        return (
                            <div 
                                key={idx} 
                                className={`ludo-token-abs ${isClickable ? 'clickable' : ''} ${t.totalAtPos > 1 ? 'small-token' : ''} ${equipped?.ludoEffect || ''}`}
                                style={{ 
                                    backgroundColor: COLORS[t.pIdx],
                                    left: `${leftPercent}%`,
                                    top: `${topPercent}%`,
                                }}
                                onClick={() => {
                                    if (isClickable) {
                                        handleMove(t.tIdx);
                                    }
                                }}
                            >
                                <div className="token-inner"></div>
                            </div>
                        );
                    })}
                </div>
            </div>

            <div className="controls">
                <div className={`dice ${isRolling ? 'rolling' : ''} ${equipped?.diceSkin || ''}`}>
                    {game.gameState?.hasRolled ? game.gameState.lastDice.value : diceVal}
                </div>
                <button 
                    className={`primary-btn roll-btn ${canRoll ? 'glow-active' : 'disabled-shade'}`} 
                    onClick={handleRoll} 
                    disabled={!canRoll}
                >
                    {isRolling ? "Rolling..." : game.gameState?.hasRolled ? "Select Token to Move" : "Roll Dice 🎲"}
                </button>
                {isMyTurn && game.gameState?.hasRolled && !isAnimating && (
                    <p className="hint">Click a token on the board to move it.</p>
                )}
            </div>
        </div>
    );
};

export default LudoGame;
