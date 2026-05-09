import React, { useState } from 'react';
import { claimDailyLogin, spinWheel } from '../api';
import { playSound } from './AudioSystem';

const Rewards = ({ userEmail }) => {
    const [rewardMsg, setRewardMsg] = useState(null);
    const [spinning, setSpinning] = useState(false);
    const [wheelDeg, setWheelDeg] = useState(0);

    const handleDailyLogin = async () => {
        const res = await claimDailyLogin({ email: userEmail });
        if (res.error) {
            setRewardMsg(res.error);
        } else {
            playSound('coin');
            setRewardMsg(`Claimed Daily! +${res.xpReward} XP, +${res.coinReward} Coins. Streak: ${res.streak}🔥`);
        }
    };

    const handleSpin = async () => {
        if (spinning) return;
        setSpinning(true);
        setRewardMsg(null);
        
        const res = await spinWheel({ email: userEmail });
        if (res.error) {
            setRewardMsg(res.error);
            setSpinning(false);
            return;
        }

        // spin animation
        playSound('spin');
        const spinTickInterval = setInterval(() => playSound('spin'), 200);

        let targetIndex = 0;
        if (res.prize.type === 'coins' && res.prize.amount === 50) targetIndex = 0;
        else if (res.prize.type === 'coins' && res.prize.amount === 100) targetIndex = 1;
        else if (res.prize.type === 'coins' && res.prize.amount === 500) targetIndex = 2;
        else if (res.prize.type === 'xp' && res.prize.amount === 100) targetIndex = 3;
        else if (res.prize.type === 'nothing') targetIndex = 4;
        else if (res.prize.type === 'xp' && res.prize.amount === 200) targetIndex = 5;

        // Calculate landing rotation so pointer at Top hits the middle of the target slice
        const baseDeg = Math.floor(wheelDeg / 360) * 360;
        const landingDeg = 360 - (targetIndex * 60 + 30);
        // Add some random offset within the slice to make it look natural (-20 to +20)
        const offset = Math.floor(Math.random() * 40) - 20;
        const newDeg = baseDeg + 3600 + landingDeg + offset;
        
        setWheelDeg(newDeg);
        
        setTimeout(() => {
            clearInterval(spinTickInterval);
            setSpinning(false);
            if (res.prize.type !== 'nothing') playSound('coin');
            else playSound('lose');
            setRewardMsg(`🎁 You won: ${res.prize.amount} ${res.prize.type.toUpperCase()}`);
        }, 4000); // 4s spin animation
    };

    return (
        <div className="tab-content">
            <h2>🎁 Daily Rewards & Spin Wheel</h2>
            
            <div className="card glass-card text-center mb-4">
                <h3>Daily Login Bonus</h3>
                <p>Login every day to increase your streak and earn more XP & Coins!</p>
                {rewardMsg && rewardMsg.includes('Daily') && <div className="alert-box" style={{ background: 'rgba(76, 175, 80, 0.8)', padding: '15px', borderRadius: '10px', marginTop: '15px', textAlign: 'center', fontSize: '1.2em' }}>{rewardMsg}</div>}
                <button className="primary-btn mt-3" onClick={handleDailyLogin}>Claim Daily Reward</button>
            </div>

            <div className="card glass-card text-center">
                <h3>🎡 Spin The Wheel</h3>
                <p>Win coins, XP, and exclusive rewards!</p>
                <div style={{ margin: '30px auto', width: '250px', height: '250px', borderRadius: '50%', background: 'conic-gradient(#f44336 0deg 60deg, #ffeb3b 60deg 120deg, #4CAF50 120deg 180deg, #2196F3 180deg 240deg, #9c27b0 240deg 300deg, #ff9800 300deg 360deg)', position: 'relative', transition: 'transform 4s cubic-bezier(0.175, 0.885, 0.32, 1)', transform: `rotate(${wheelDeg}deg)`, boxShadow: '0 0 20px rgba(255,255,255,0.2)' }}>
                    {/* Wheel Labels */}
                    <div style={{position: 'absolute', width: '100%', height: '100%', transform: 'rotate(30deg)'}}>
                        <span style={{position: 'absolute', top: '10%', left: '50%', transform: 'translateX(-50%)', fontWeight: 'bold', color: '#fff', textShadow: '1px 1px 2px #000'}}>50 🪙</span>
                    </div>
                    <div style={{position: 'absolute', width: '100%', height: '100%', transform: 'rotate(90deg)'}}>
                        <span style={{position: 'absolute', top: '10%', left: '50%', transform: 'translateX(-50%)', fontWeight: 'bold', color: '#000', textShadow: '1px 1px 2px #fff'}}>100 🪙</span>
                    </div>
                    <div style={{position: 'absolute', width: '100%', height: '100%', transform: 'rotate(150deg)'}}>
                        <span style={{position: 'absolute', top: '10%', left: '50%', transform: 'translateX(-50%)', fontWeight: 'bold', color: '#fff', textShadow: '1px 1px 2px #000'}}>500 🪙</span>
                    </div>
                    <div style={{position: 'absolute', width: '100%', height: '100%', transform: 'rotate(210deg)'}}>
                        <span style={{position: 'absolute', top: '10%', left: '50%', transform: 'translateX(-50%)', fontWeight: 'bold', color: '#fff', textShadow: '1px 1px 2px #000'}}>100 XP</span>
                    </div>
                    <div style={{position: 'absolute', width: '100%', height: '100%', transform: 'rotate(270deg)'}}>
                        <span style={{position: 'absolute', top: '10%', left: '50%', transform: 'translateX(-50%)', fontWeight: 'bold', color: '#fff', textShadow: '1px 1px 2px #000'}}>0 😢</span>
                    </div>
                    <div style={{position: 'absolute', width: '100%', height: '100%', transform: 'rotate(330deg)'}}>
                        <span style={{position: 'absolute', top: '10%', left: '50%', transform: 'translateX(-50%)', fontWeight: 'bold', color: '#fff', textShadow: '1px 1px 2px #000'}}>200 XP</span>
                    </div>
                    {/* Center Pin */}
                    <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '30px', height: '30px', background: '#fff', borderRadius: '50%', zIndex: 2, boxShadow: 'inset 0 0 5px #000' }}></div>
                </div>
                {/* Pointer */}
                <div style={{ width: 0, height: 0, borderLeft: '20px solid transparent', borderRight: '20px solid transparent', borderTop: '30px solid white', margin: '-50px auto 20px auto', position: 'relative', zIndex: 3, filter: 'drop-shadow(0 2px 2px rgba(0,0,0,0.5))' }}></div>
                
                {rewardMsg && !rewardMsg.includes('Daily') && <div className="alert-box spin-reward-anim" style={{ background: 'rgba(33, 150, 243, 0.8)', padding: '15px', borderRadius: '10px', margin: '20px auto', maxWidth: '300px', textAlign: 'center', fontSize: '1.2em', fontWeight: 'bold', animation: 'scaleUp 0.5s cubic-bezier(0.175, 0.885, 0.32, 1)' }}>{rewardMsg}</div>}
                
                <button className="primary-btn mt-3" onClick={handleSpin} disabled={spinning}>{spinning ? 'Spinning...' : 'SPIN NOW'}</button>
            </div>
            
            <style>{`
                @keyframes scaleUp {
                    from { transform: scale(0.5); opacity: 0; }
                    to { transform: scale(1); opacity: 1; }
                }
            `}</style>
        </div>
    );
};

export default Rewards;
