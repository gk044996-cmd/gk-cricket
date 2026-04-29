import React, { useState, useEffect, useRef, useCallback } from 'react';
import { getGame, selectTossChoice, flipCoin, selectBatBowl } from '../api';
import './GameScreen.css';

const TossScreen = ({ gameId, userEmail, username, onExit, onTossComplete }) => {
    const [game, setGame] = useState(null);
    const [loading, setLoading] = useState(true);
    const [coinAnim, setCoinAnim] = useState(false);
    const [showResult, setShowResult] = useState(false);
    const isPolling = useRef(true);

    const loadGame = useCallback(async () => {
        if (!isPolling.current) return;
        try {
            const data = await getGame(gameId);
            
            // If toss is newly decided, trigger animation
            if (data.toss && data.toss.result && !showResult && !coinAnim) {
                isPolling.current = false;
                setCoinAnim(true);
                setTimeout(() => {
                    setCoinAnim(false);
                    setShowResult(true);
                    isPolling.current = true;
                    if (data.tossCompleted) onTossComplete();
                }, 3000); // 3 sec spinning animation
            } else if (data.tossCompleted && showResult) {
                onTossComplete();
            }

            setGame(data);
            setLoading(false);
        } catch (e) { console.error(e); }
    }, [gameId, coinAnim, showResult, onTossComplete]);

    useEffect(() => {
        loadGame();
        const interval = setInterval(loadGame, 2000);
        return () => clearInterval(interval);
    }, [loadGame]);

    if (loading || !game) return <div className="game-loading">Loading Toss...</div>;

    const amIP1 = game.player1 === userEmail;
    const opponentEmail = amIP1 ? game.player2 : game.player1;
    const opponentName = opponentEmail.split('@')[0];

    const toss = game.toss || {};
    
    const handleChoice = async (choice) => {
        await selectTossChoice({ gameId, userEmail, choice });
        loadGame();
    };

    const handleFlip = async () => {
        await flipCoin({ gameId });
        loadGame();
    };

    const handleDecision = async (decision) => {
        await selectBatBowl({ gameId, decision });
        loadGame();
    };

    return (
        <div className="game-screen glass-card text-center" style={{ minHeight: '60vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <h2 className="vs-title mb-4">🪙 Match Toss</h2>
            <div className="mode-badge">VS {opponentName}</div>

            <div className="toss-area mt-4">
                {coinAnim ? (
                    <div className="coin-spin-anim" style={{ fontSize: '100px', animation: 'spin 0.2s infinite linear' }}>🪙</div>
                ) : (
                    <div>
                        {(!toss.choice) && (
                            <div>
                                {!amIP1 ? (
                                    <div>
                                        <h4>{username}, choose Head or Tail:</h4>
                                        <div style={{ display: 'flex', gap: '15px', justifyContent: 'center', marginTop: '20px' }}>
                                            <button className="primary-btn" onClick={() => handleChoice('head')}>HEAD</button>
                                            <button className="primary-btn" onClick={() => handleChoice('tail')}>TAIL</button>
                                        </div>
                                    </div>
                                ) : (
                                    <h4>Waiting for {opponentName} to choose Head or Tail... ⏳</h4>
                                )}
                            </div>
                        )}

                        {(toss.choice && !toss.result) && (
                            <div>
                                {amIP1 ? (
                                    <div>
                                        <h4>{opponentName} chose {toss.choice.toUpperCase()}.</h4>
                                        <button className="primary-btn mt-3" style={{ fontSize: '24px', padding: '15px 30px' }} onClick={handleFlip}>🪙 FLIP COIN</button>
                                    </div>
                                ) : (
                                    <h4>Waiting for {game.player1.split('@')[0]} to flip the coin... ⏳</h4>
                                )}
                            </div>
                        )}

                        {(showResult) && (
                            <div className="toss-result-box" style={{ animation: 'fadeIn 1s' }}>
                                <div style={{ fontSize: '80px' }}>{toss.result === 'head' ? '🤴' : '🦅'}</div>
                                <h3 className="mt-2 text-warning">It's a {toss.result.toUpperCase()}!</h3>
                                
                                {toss.winner === userEmail ? (
                                    <div className="mt-4">
                                        <h4 className="text-success">You won the toss!</h4>
                                        <p>What do you want to do?</p>
                                        <div style={{ display: 'flex', gap: '15px', justifyContent: 'center', marginTop: '20px' }}>
                                            <button className="primary-btn" style={{ background: '#29b6f6' }} onClick={() => handleDecision('bat')}>🏏 BAT</button>
                                            <button className="primary-btn" style={{ background: '#ef5350' }} onClick={() => handleDecision('bowl')}>🎯 BOWL</button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="mt-4">
                                        <h4 className="text-danger">{toss.winner.split('@')[0]} won the toss!</h4>
                                        <p>Waiting for them to decide...</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>

            <style>{`
                @keyframes spin { 100% { transform: rotateY(360deg); } }
                @keyframes fadeIn { from { opacity: 0; transform: scale(0.9); } to { opacity: 1; transform: scale(1); } }
            `}</style>
        </div>
    );
};

export default TossScreen;
