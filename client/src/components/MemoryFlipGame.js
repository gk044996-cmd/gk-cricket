import React, { useState, useEffect } from "react";
import { getGame, playMemoryFlip, endMemoryFlipTurn, requestRematch, acceptRematch, declineRematch } from "../api";
import "./MemoryFlipGame.css";

const MemoryFlipGame = ({ gameId, userEmail, username, onExit, onPlayAgainBot }) => {
    const getDisplayName = (email) => {
        if (!email) return "Unknown";
        if (email === userEmail) return username || "You";
        if (email.startsWith("Bot")) return email;
        return email.split('@')[0];
    };

    const emojis = { 1: "🐶", 2: "🐱", 3: "🐭", 4: "🐹", 5: "🐰", 6: "🦊", 7: "🐼", 8: "🐨" };
    const [game, setGame] = useState(null);
    const [isProcessing, setIsProcessing] = useState(false);

    const loadGame = async () => {
        try {
            const data = await getGame(gameId);
            if (data && data._id) {
                setGame(data);
                if (data.gameState?.flippedIndexes?.length === 2 && data.currentTurn === userEmail) {
                    setTimeout(async () => {
                        await endMemoryFlipTurn({ gameId, userEmail });
                        loadGame();
                    }, 1500);
                }
            }
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
                if (game.gameState?.flippedIndexes?.length === 2) {
                    setTimeout(async () => {
                        await endMemoryFlipTurn({ gameId, userEmail: game.currentTurn });
                        loadGame();
                    }, 1500);
                } else {
                    const triggerBot = async () => {
                        await new Promise(r => setTimeout(r, 1000));
                        let available = [];
                        game.gameState.cards.forEach((c, idx) => {
                            if (!c.flipped && !c.matched && !game.gameState.flippedIndexes.includes(idx)) available.push(idx);
                        });
                        if (available.length > 0) {
                            let pick = available[Math.floor(Math.random() * available.length)];
                            await playMemoryFlip({ gameId, userEmail: game.currentTurn, index: pick });
                            loadGame();
                        }
                    };
                    triggerBot();
                }
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [game]);

    const handleFlip = async (idx) => {
        if (isProcessing || game.currentTurn !== userEmail || game.gameState?.flippedIndexes?.length >= 2) return;
        if (game.gameState.cards[idx].flipped || game.gameState.cards[idx].matched) return;
        
        setIsProcessing(true);
        await playMemoryFlip({ gameId, userEmail, index: idx });
        await loadGame();
        setIsProcessing(false);
    };

    if (!game) return <div className="loading">Loading Game...</div>;

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
                            <div className="scores-list" style={{margin: '15px 0'}}>
                                {Object.keys(game.gameState?.scores || {}).map(p => (
                                    <p key={p}>{getDisplayName(p)}: {game.gameState.scores[p]} pairs</p>
                                ))}
                            </div>
                            
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
        <div className="game-container memory-container">
            <div className="game-header">
                <button className="exit-btn" onClick={() => onExit(false)}>⬅ Leave Game</button>
                <h2>🃏 Memory Flip</h2>
                <div className="turn-indicator">
                    {isMyTurn ? "Your Turn!" : `${getDisplayName(game.currentTurn)}'s Turn`}
                </div>
            </div>

            <div className="scores-hud">
                {(game.players || []).map((p) => (
                    <div key={p} className={`score-badge ${game.currentTurn === p ? 'active' : ''}`}>
                        <span>{getDisplayName(p)}</span>
                        <span className="score-val">{game.gameState?.scores?.[p] || 0}</span>
                    </div>
                ))}
            </div>

            <div className="memory-board">
                {(game.gameState?.cards || []).map((c, idx) => (
                    <div 
                        key={idx} 
                        className={`memory-card ${c.flipped || c.matched ? 'flipped' : ''} ${c.matched ? 'matched' : ''} ${isMyTurn && !c.flipped && !c.matched && (game.gameState?.flippedIndexes?.length || 0) < 2 ? 'clickable' : ''}`}
                        onClick={() => handleFlip(idx)}
                    >
                        <div className="card-inner">
                            <div className="card-front">❓</div>
                            <div className="card-back" style={{display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#b6e3f4', borderRadius: '10px'}}>
                                <span className={`animated-emoji ${c.matched ? 'matched-anim' : ''}`} style={{fontSize: '50px'}}>{emojis[c.id]}</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
            
            {game.gameState?.flippedIndexes?.length === 2 && (
                <div className="status-toast mismatch-toast">
                    {game.gameState.cards[game.gameState.flippedIndexes[0]].id === game.gameState.cards[game.gameState.flippedIndexes[1]].id 
                        ? "Match! +1 Point" 
                        : "No match! Next turn..."}
                </div>
            )}
        </div>
    );
};

export default MemoryFlipGame;
