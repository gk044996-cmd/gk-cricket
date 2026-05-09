import React, { useState, useEffect } from 'react';

const TurnTimer = ({ isActive, onTimeout, duration = 10 }) => {
    const [timeLeft, setTimeLeft] = useState(duration);

    useEffect(() => {
        if (!isActive) {
            setTimeLeft(duration);
            return;
        }

        const timer = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 1) {
                    clearInterval(timer);
                    if (onTimeout) onTimeout();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [isActive, onTimeout, duration]);

    if (!isActive) return null;

    const progress = (timeLeft / duration) * 100;
    const isLow = timeLeft <= 3;

    return (
        <div style={{
            position: 'relative',
            width: '60px',
            height: '60px',
            margin: '0 auto 10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(255, 255, 255, 0.1)',
            borderRadius: '50%',
            boxShadow: '0 4px 15px rgba(0,0,0,0.3)',
            animation: isLow ? 'pulseRed 1s infinite' : 'none'
        }}>
            <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
                <circle
                    cx="30"
                    cy="30"
                    r="26"
                    stroke="rgba(255, 255, 255, 0.2)"
                    strokeWidth="4"
                    fill="none"
                />
                <circle
                    cx="30"
                    cy="30"
                    r="26"
                    stroke={isLow ? '#ff4d4d' : '#4caf50'}
                    strokeWidth="4"
                    fill="none"
                    strokeDasharray="163.36" // 2 * PI * 26
                    strokeDashoffset={163.36 - (163.36 * progress) / 100}
                    style={{ transition: 'stroke-dashoffset 1s linear, stroke 0.3s' }}
                />
            </svg>
            <span style={{
                position: 'relative',
                fontSize: '18px',
                fontWeight: 'bold',
                color: isLow ? '#ff4d4d' : '#fff',
                textShadow: '0 2px 4px rgba(0,0,0,0.5)'
            }}>
                {timeLeft}s
            </span>
            <style>{`
                @keyframes pulseRed {
                    0% { box-shadow: 0 0 0 0 rgba(255, 77, 77, 0.7); }
                    70% { box-shadow: 0 0 0 15px rgba(255, 77, 77, 0); }
                    100% { box-shadow: 0 0 0 0 rgba(255, 77, 77, 0); }
                }
            `}</style>
        </div>
    );
};

export default TurnTimer;
