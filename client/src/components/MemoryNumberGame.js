import React, { useState, useEffect } from "react";
import { getGame, playMemoryNumber, requestRematch, acceptRematch, declineRematch } from "../api";
import TurnTimer from "./TurnTimer";
import "./MemoryNumberGame.css";

const MemoryNumberGame = ({ gameId, userEmail, username, onExit, onPlayAgainBot, equipped }) => {
    const getDisplayName = (email) => {
        if (!email) return "Unknown";
        if (email === userEmail) return username || "You";
        if (email.startsWith("Bot")) return email;
        return email.split('@')[0];
    };

    const [game, setGame] = useState(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [wrongIndex, setWrongIndex] = useState(null);

    const loadGame = async () => {
        try {
            const data = await getGame(gameId);
            if (data && data._id) setGame(data);
        } catch (e) {}
    };

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
                    await new Promise(r => setTimeout(r, 1200));
                    // Bot tries to guess sequential numbers.
                    // A simple bot: knows some numbers, guesses others.
                    let target = game.gameState.currentTarget;
                    let grid = game.gameState.grid;
                    let targetIdx = grid.indexOf(target);
                    // Add some random chance to miss
                    if (Math.random() < 0.2 && target > 3) {
                        let wrongIdx = Math.floor(Math.random() * 9);
                        while(wrongIdx === targetIdx || game.gameState.revealed.includes(wrongIdx)) {
                            wrongIdx = (wrongIdx + 1) % 9;
                        }
                        targetIdx = wrongIdx;
                    }
                    await playMemoryNumber({ gameId, userEmail: game.currentTurn, index: targetIdx });
                    loadGame();
                };
                triggerBot();
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [game]);

    const handlePick = async (idx) => {
        if (isProcessing || game.currentTurn !== userEmail) return;
        if (game.gameState?.revealed.includes(idx)) return;
        
        setIsProcessing(true);
        const target = game.gameState.currentTarget;
        const clickedNumber = game.gameState.grid[idx];
        
        if (clickedNumber !== target) {
            setWrongIndex(idx);
            setTimeout(async () => {
                setWrongIndex(null);
                await playMemoryNumber({ gameId, userEmail, index: idx });
                loadGame();
                setIsProcessing(false);
            }, 1000);
            return;
        }

        await playMemoryNumber({ gameId, userEmail, index: idx });
        await loadGame();
        setIsProcessing(false);
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

    return (
        <div className="game-container seq-container">
            <div className="game-header">
                <button className="exit-btn" onClick={() => onExit(false)}>⬅ Leave Game</button>
                <h2>🔢 Memory Number</h2>
                <div className="turn-indicator">
                    {isMyTurn ? "Your Turn!" : `${getDisplayName(game.currentTurn)}'s Turn`}
                </div>
            </div>

            {game.status === 'playing' && (
                <TurnTimer isActive={isMyTurn && !isProcessing && wrongIndex === null} onTimeout={() => {
                    playMemoryNumber({ gameId, userEmail, action: 'timeout' }).then(loadGame);
                }} duration={10} />
            )}

            <div className="info-panel">
                <div className="target-num">Find: <span>{game.gameState?.currentTarget}</span></div>
            </div>

            <div className="players-status-hud">
                {(game.players || []).map(p => (
                    <div key={p} className={`p-status ${game.currentTurn === p ? 'active' : ''}`}>
                        {getDisplayName(p)}
                    </div>
                ))}
            </div>

            <div className={`number-grid memory-board ${equipped?.cardSkin || ''}`}>
                {(game.gameState?.grid || []).map((num, idx) => {
                    const isRevealed = (game.gameState?.revealed || []).includes(idx);
                    return (
                            <div 
                                key={idx} 
                                className={`num-box memory-card ${isRevealed || wrongIndex === idx ? 'revealed' : ''} ${wrongIndex === idx ? 'shake-error' : ''} ${isMyTurn && !isRevealed && wrongIndex === null ? 'clickable' : ''}`}
                            onClick={() => {
                                if (isMyTurn && !isRevealed && wrongIndex === null) handlePick(idx);
                            }}
                        >
                            <div className="num-inner">
                                <div className="num-front">❓</div>
                                <div className="num-back" style={wrongIndex === idx ? {color: '#ff4d4d'} : {}}>{num}</div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default MemoryNumberGame;
