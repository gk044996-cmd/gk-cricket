import React, { useState, useEffect, useRef, useCallback } from 'react';
import { getGame, playHiddenNumber } from '../api';
import './GameScreen.css';

const HiddenNumberGame = ({ gameId, userEmail, username, onExit }) => {
    const [game, setGame] = useState(null);
    const [loading, setLoading] = useState(true);
    const [secretInput, setSecretInput] = useState('');
    const [guessInput, setGuessInput] = useState('');
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
        const gs = game.gameState || {};
        const isFinished = game.status === 'finished';
        const isBotTurn = gs.turn === "Bot";

        if (isBotTurn && !isFinished) {
            console.log("Turn: bot");
            console.log("Bot move triggered");
            const timer = setTimeout(() => {
                const amIP1 = game.player1 === userEmail;
                const oppGuesses = amIP1 ? (gs.p2Guesses || []) : (gs.p1Guesses || []);
                let min = 0, max = 99;
                oppGuesses.forEach(g => {
                    if(g.result === "Higher" && g.guess >= min) min = g.guess + 1;
                    if(g.result === "Lower" && g.guess <= max) max = g.guess - 1;
                });
                const botGuess = Math.floor(Math.random() * (max - min + 1)) + min;
                playHiddenNumber({ gameId, userEmail: "Bot", move: botGuess, type: 'guess' }).then(loadGame);
            }, 700);
            return () => clearTimeout(timer);
        }
    }, [game, gameId, userEmail, loadGame]);

    if (loading || !game) return <div className="game-loading">Loading Hidden Number...</div>;

    const amIP1 = game.player1 === userEmail;
    const gs = game.gameState || {};
    const mySecret = amIP1 ? gs.p1Secret : gs.p2Secret;
    const oppSecret = amIP1 ? gs.p2Secret : gs.p1Secret;
    const myGuesses = amIP1 ? (gs.p1Guesses || []) : (gs.p2Guesses || []);
    const oppGuesses = amIP1 ? (gs.p2Guesses || []) : (gs.p1Guesses || []);
    
    const opponentEmail = amIP1 ? game.player2 : game.player1;
    const opponentName = opponentEmail.split('@')[0];
    const isFinished = game.status === 'finished';
    const isMyTurn = gs.turn === userEmail;

    const handleSetSecret = async () => {
        const num = parseInt(secretInput);
        if (isNaN(num) || num < 0 || num > 99) return alert("Enter number between 0 and 99");
        if (makingMove) return;
        
        setMakingMove(true);
        const key = amIP1 ? 'p1Secret' : 'p2Secret';
        setGame(prev => ({ ...prev, gameState: { ...prev.gameState, [key]: num } }));
        try {
            await playHiddenNumber({ gameId, userEmail, move: num, type: 'set_secret' });
            await loadGame();
        } finally { setMakingMove(false); }
    };

    const handleGuess = async () => {
        const num = parseInt(guessInput);
        if (isNaN(num) || num < 0 || num > 99) return alert("Enter number between 0 and 99");
        if (makingMove) return;

        setMakingMove(true);
        setGame(prev => ({ ...prev, gameState: { ...prev.gameState, turn: opponentEmail } }));
        try {
            await playHiddenNumber({ gameId, userEmail, move: num, type: 'guess' });
            setGuessInput('');
            await loadGame();
        } finally { setMakingMove(false); }
    };

    const handlePressSecret = (num) => {
        setSecretInput(prev => (prev.length < 2 ? prev + num : prev));
    };
    const handlePressGuess = (num) => {
        setGuessInput(prev => (prev.length < 2 ? prev + num : prev));
    };

    return (
        <div className="game-screen glass-card">
            <button className="exit-btn" onClick={onExit}>⬅ Leave Game</button>
            <h2 className="vs-title">{username} <span className="vs-badge">VS</span> {opponentName}</h2>
            <div className="mode-badge">HIDDEN NUMBER</div>

            {mySecret == null || oppSecret == null ? (
                <div className="setup-phase text-center mt-4">
                    <h3>Secret Number Setup</h3>
                    {mySecret == null ? (
                        <div>
                            <p>Enter your secret number (0-99):</p>
                            <div className="dial-pad" style={{ maxWidth: '250px', margin: '0 auto', background: 'rgba(0,0,0,0.2)', padding: '20px', borderRadius: '12px' }}>
                                <div className="dial-display" style={{ background: '#fff', color: '#000', fontSize: '36px', height: '60px', borderRadius: '8px', marginBottom: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                                    {secretInput || '-'}
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => (
                                        <button key={n} onClick={() => handlePressSecret(n.toString())} className="play-btn" style={{ fontSize: '24px', padding: '15px 0' }}>{n}</button>
                                    ))}
                                    <button onClick={() => setSecretInput('')} className="play-btn" style={{ background: '#f44336', fontSize: '16px' }}>CLR</button>
                                    <button onClick={() => handlePressSecret('0')} className="play-btn" style={{ fontSize: '24px', padding: '15px 0' }}>0</button>
                                    <button onClick={handleSetSecret} className="play-btn" style={{ background: '#4CAF50', fontSize: '16px' }}>OK</button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <p>⏳ Waiting for {opponentName} to set their secret...</p>
                    )}
                </div>
            ) : (
                <div className="playing-phase mt-3">
                    <div className="scoreboard">
                        <div className={`score-card ${isMyTurn ? 'active-turn' : ''}`}>
                            <h3>You</h3>
                            <p className="score">?</p>
                            {isMyTurn && !isFinished && <span className="batting-badge">Your Turn</span>}
                        </div>
                        <div className={`score-card ${!isMyTurn ? 'active-turn' : ''}`}>
                            <h3>{opponentName}</h3>
                            <p className="score">?</p>
                            {!isMyTurn && !isFinished && <span className="batting-badge">Waiting</span>}
                        </div>
                    </div>

                    {!isFinished && isMyTurn && (
                        <div className="action-area text-center mt-3">
                            <h4>Make a Guess</h4>
                            <div className="dial-pad" style={{ maxWidth: '250px', margin: '0 auto', background: 'rgba(0,0,0,0.2)', padding: '20px', borderRadius: '12px' }}>
                                <div className="dial-display" style={{ background: '#fff', color: '#000', fontSize: '36px', height: '60px', borderRadius: '8px', marginBottom: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                                    {guessInput || '-'}
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => (
                                        <button key={n} onClick={() => handlePressGuess(n.toString())} className="play-btn" style={{ fontSize: '24px', padding: '15px 0' }} disabled={makingMove}>{n}</button>
                                    ))}
                                    <button onClick={() => setGuessInput('')} className="play-btn" style={{ background: '#f44336', fontSize: '16px' }} disabled={makingMove}>CLR</button>
                                    <button onClick={() => handlePressGuess('0')} className="play-btn" style={{ fontSize: '24px', padding: '15px 0' }} disabled={makingMove}>0</button>
                                    <button onClick={handleGuess} className="play-btn" style={{ background: '#4CAF50', fontSize: '16px' }} disabled={makingMove}>OK</button>
                                </div>
                            </div>
                        </div>
                    )}
                    
                    {!isFinished && !isMyTurn && (
                        <p className="waiting-text text-center mt-3">⏳ Waiting for {opponentName} to guess...</p>
                    )}

                    <div className="history-logs d-flex justify-content-between mt-4" style={{ display: 'flex', gap: '20px' }}>
                        <div className="flex-1" style={{ flex: 1 }}>
                            <h5 className="text-center">Your Guesses</h5>
                            <ul style={{ listStyle: 'none', padding: 0 }}>
                                {myGuesses.map((g, i) => (
                                    <li key={i} className="anim-guess-reveal mb-1 text-center" style={{ background: 'rgba(255,255,255,0.1)', padding: '5px', borderRadius: '5px', marginBottom: '5px' }}>
                                        {g.guess} ➔ <strong>{g.result}</strong>
                                    </li>
                                ))}
                            </ul>
                        </div>
                        <div className="flex-1" style={{ flex: 1 }}>
                            <h5 className="text-center">Opponent's Guesses</h5>
                            <ul style={{ listStyle: 'none', padding: 0 }}>
                                {oppGuesses.map((g, i) => (
                                    <li key={i} className="anim-guess-reveal mb-1 text-center" style={{ background: 'rgba(255,255,255,0.1)', padding: '5px', borderRadius: '5px', marginBottom: '5px' }}>
                                        {g.guess} ➔ <strong>{g.result}</strong>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </div>
            )}

            {isFinished && (
                <div className="winner-popup">
                    <h2>Game Over!</h2>
                    <p>Winner: <strong>{game.winner === userEmail ? "You! 🎉" : `${opponentName} 😔`}</strong></p>
                    <p>Your secret was {mySecret}. Opponent's secret was {oppSecret}.</p>
                    <button className="primary-btn mt-3" onClick={onExit}>Return to Dashboard</button>
                </div>
            )}
        </div>
    );
};

export default HiddenNumberGame;
