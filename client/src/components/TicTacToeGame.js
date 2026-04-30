import React, { useState, useEffect, useRef, useCallback } from 'react';
import { getGame, playTicTacToe, requestRematch, acceptRematch, declineRematch } from '../api';
import './GameScreen.css';

const TicTacToeGame = ({ gameId, userEmail, username, onExit, onPlayAgainBot }) => {
    const getDisplayName = (email) => {
        if (!email) return "Unknown";
        if (email === userEmail) return username || "You";
        if (email.startsWith("Bot")) return email;
        return email.split('@')[0];
    };

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
        const isFinished = game.status === 'finished';
        const isBotTurn = game.currentTurn === "Bot" && !isFinished;
        
        if (isBotTurn) {
            console.log("Turn: bot");
            console.log("Bot move triggered");
            const timer = setTimeout(() => {
                const gs = game.gameState || { board: Array(9).fill(null) };
                const emptyCells = gs.board
                  .map((val, idx) => val === null ? idx : null)
                  .filter(val => val !== null);
                
                if (emptyCells.length > 0) {
                    const randomIndex = emptyCells[Math.floor(Math.random() * emptyCells.length)];
                    playTicTacToe({ gameId, userEmail: "Bot", move: randomIndex }).then(loadGame);
                }
            }, 700);
            return () => clearTimeout(timer);
        }
    }, [game, gameId, loadGame]);

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

    if (loading || !game) return <div className="game-loading">Loading Tic Tac Toe...</div>;

    const mySymbol = amIP1 ? "X" : "O";
    const oppSymbol = amIP1 ? "O" : "X";
    const gs = game.gameState || { board: Array(9).fill(null) };
    const board = gs.board;

    const opponentName = getDisplayName(opponentEmail);
    const isFinished = game.status === 'finished';
    const isMyTurn = game.currentTurn === userEmail;

    const handlePlay = async (index) => {
        if (!isMyTurn || isFinished || board[index] || makingMove) return;
        
        setMakingMove(true);
        // Optimistic Update
        const newBoard = [...board];
        newBoard[index] = mySymbol;
        setGame(prev => ({
            ...prev,
            currentTurn: opponentEmail,
            gameState: { ...prev.gameState, board: newBoard }
        }));

        try {
            await playTicTacToe({ gameId, userEmail, move: index });
            await loadGame();
        } catch(e) {
            console.error(e);
        } finally {
            setMakingMove(false);
        }
    };

    const winPatterns = [
        [0,1,2],[3,4,5],[6,7,8],
        [0,3,6],[1,4,7],[2,5,8],
        [0,4,8],[2,4,6]
    ];
    let winningIndices = [];
    if (isFinished && game.winner && game.winner !== "Draw") {
        const symbol = game.winner === game.player1 ? "X" : "O";
        for (let pattern of winPatterns) {
            const [a, b, c] = pattern;
            if (board[a] === symbol && board[b] === symbol && board[c] === symbol) {
                winningIndices = pattern;
                break;
            }
        }
    }

    return (
        <div className="game-screen glass-card">
            {!isFinished && (
                <button className="exit-btn" onClick={() => onExit(false)}>⬅ Leave Game</button>
            )}
            <h2 className="vs-title">{username} <span className="vs-badge">VS</span> {opponentName}</h2>
            <div className="mode-badge">TIC TAC TOE</div>

            <div className="scoreboard mt-3 mb-4">
                <div className={`score-card ${isMyTurn && !isFinished ? 'active-turn' : ''}`}>
                    <h3>You ({mySymbol})</h3>
                    {isMyTurn && !isFinished && <span className="batting-badge">Your Turn</span>}
                </div>
                <div className={`score-card ${!isMyTurn && !isFinished ? 'active-turn' : ''}`}>
                    <h3>{opponentName} ({oppSymbol})</h3>
                    {!isMyTurn && !isFinished && <span className="batting-badge">Waiting</span>}
                </div>
            </div>

            <div className="ttt-board" style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '10px',
                maxWidth: '300px',
                margin: '0 auto'
            }}>
                {board.map((cell, idx) => (
                    <div 
                        key={idx} 
                        onClick={() => handlePlay(idx)}
                        className={`${cell ? 'ttt-symbol' : ''} ${winningIndices.includes(idx) ? 'ttt-win-line' : ''}`}
                        style={{
                            background: 'rgba(255,255,255,0.1)',
                            border: '2px solid rgba(255,255,255,0.3)',
                            height: '90px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '48px',
                            fontWeight: 'bold',
                            cursor: (!cell && isMyTurn && !isFinished) ? 'pointer' : 'default',
                            borderRadius: '10px',
                            color: cell === 'X' ? '#ff8a00' : (cell === 'O' ? '#29b6f6' : '#fff'),
                            transition: 'background 0.3s'
                        }}
                        onMouseEnter={e => { if(!cell && isMyTurn && !isFinished) e.target.style.background = 'rgba(255,255,255,0.2)'; }}
                        onMouseLeave={e => { e.target.style.background = 'rgba(255,255,255,0.1)'; }}
                    >
                        {cell}
                    </div>
                ))}
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
                            <p>Winner: <strong>{game.winner === userEmail ? "You! 🎉" : (game.winner === "Draw" ? "Draw 🤝" : `${opponentName} 😔`)}</strong></p>
                            
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

export default TicTacToeGame;
