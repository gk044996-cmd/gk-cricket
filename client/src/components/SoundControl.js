import React, { useState, useEffect } from 'react';
import { toggleSound, isSoundEnabled, toggleMusic, isMusicEnabled, playSound } from './AudioSystem';

const SoundControl = () => {
    const [soundOn, setSoundOn] = useState(isSoundEnabled());
    const [musicOn, setMusicOn] = useState(isMusicEnabled());

    useEffect(() => {
        const handleGlobalClick = (e) => {
            if (e.target.closest('button') || e.target.closest('.game-card') || e.target.closest('.play-btn') || e.target.closest('.board-cell')) {
                playSound('click');
            }
        };
        document.addEventListener('click', handleGlobalClick);
        return () => document.removeEventListener('click', handleGlobalClick);
    }, []);

    const handleToggleSound = (e) => {
        e.stopPropagation();
        setSoundOn(toggleSound());
    };

    const handleToggleMusic = (e) => {
        e.stopPropagation();
        setMusicOn(toggleMusic());
    };

    const btnStyle = {
        background: 'rgba(0,0,0,0.6)',
        border: '1px solid rgba(255,255,255,0.2)',
        color: '#fff',
        borderRadius: '50%',
        width: '50px',
        height: '50px',
        fontSize: '24px',
        cursor: 'pointer',
        boxShadow: '0 4px 10px rgba(0,0,0,0.5)',
        backdropFilter: 'blur(5px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'transform 0.2s'
    };

    return (
        <div style={{ position: 'fixed', bottom: '20px', right: '20px', zIndex: 1000, display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <button 
                onClick={handleToggleMusic}
                style={btnStyle}
                onMouseOver={e => e.target.style.transform = 'scale(1.1)'}
                onMouseOut={e => e.target.style.transform = 'scale(1)'}
                title="Toggle Music"
            >
                {musicOn ? '🎵' : '🔇'}
            </button>
            <button 
                onClick={handleToggleSound}
                style={btnStyle}
                onMouseOver={e => e.target.style.transform = 'scale(1.1)'}
                onMouseOut={e => e.target.style.transform = 'scale(1)'}
                title="Toggle SFX"
            >
                {soundOn ? '🔊' : '🔇'}
            </button>
        </div>
    );
};

export default SoundControl;
