const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
let soundEnabled = true;
let musicEnabled = true;

// Basic synth for sound effects
const playTone = (freq, type, duration, vol = 0.1) => {
    if (!soundEnabled || audioCtx.state === 'suspended') return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
    gain.gain.setValueAtTime(vol, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + duration);
};

export const playSound = (soundType) => {
    if (!soundEnabled) return;
    
    // Resume context if suspended (browser auto-play policy)
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }

    switch(soundType) {
        case 'click':
            playTone(600, 'sine', 0.1, 0.05);
            break;
        case 'roll':
            for(let i=0; i<6; i++) {
                setTimeout(() => playTone(800 + Math.random()*400, 'triangle', 0.05, 0.05), i*60);
            }
            break;
        case 'win':
            playTone(400, 'sine', 0.15, 0.1);
            setTimeout(() => playTone(500, 'sine', 0.15, 0.1), 150);
            setTimeout(() => playTone(600, 'sine', 0.15, 0.1), 300);
            setTimeout(() => playTone(800, 'sine', 0.4, 0.15), 450);
            break;
        case 'lose':
            playTone(300, 'sawtooth', 0.2, 0.1);
            setTimeout(() => playTone(250, 'sawtooth', 0.3, 0.1), 200);
            setTimeout(() => playTone(200, 'sawtooth', 0.5, 0.1), 400);
            break;
        case 'flip':
            playTone(300, 'sine', 0.05, 0.05);
            setTimeout(() => playTone(450, 'sine', 0.05, 0.05), 60);
            break;
        case 'move':
            playTone(450, 'square', 0.1, 0.03);
            break;
        case 'coin':
            playTone(1200, 'sine', 0.1, 0.05);
            setTimeout(() => playTone(1800, 'sine', 0.3, 0.05), 100);
            break;
        case 'hit': // Cricket bat hit
            playTone(200, 'square', 0.1, 0.1);
            setTimeout(() => playTone(600, 'sine', 0.2, 0.1), 50);
            break;
        case 'out': // Wicket
            playTone(150, 'sawtooth', 0.5, 0.15);
            break;
        case 'snake': // Snake bite
            playTone(200, 'sawtooth', 0.4, 0.1);
            setTimeout(() => playTone(150, 'sawtooth', 0.4, 0.1), 200);
            break;
        case 'ladder': // Ladder climb
            for(let i=0; i<5; i++) {
                setTimeout(() => playTone(300 + (i*100), 'sine', 0.1, 0.05), i*100);
            }
            break;
        case 'match': // Pair match in memory
            playTone(800, 'sine', 0.1, 0.05);
            setTimeout(() => playTone(1200, 'sine', 0.2, 0.05), 100);
            break;
        case 'spin': // Tick of spin wheel
            playTone(1000, 'triangle', 0.05, 0.05);
            break;
        default:
            break;
    }
};

let bgmInterval = null;

const playBgmNote = (freq, duration) => {
    if (!musicEnabled || audioCtx.state === 'suspended') return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
    gain.gain.setValueAtTime(0.02, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + duration);
};

const bgmSequence = [
    {f: 261.63, d: 0.5}, {f: 329.63, d: 0.5}, {f: 392.00, d: 0.5}, {f: 329.63, d: 0.5},
    {f: 261.63, d: 0.5}, {f: 349.23, d: 0.5}, {f: 440.00, d: 0.5}, {f: 349.23, d: 0.5}
];

export const toggleMusic = () => {
    musicEnabled = !musicEnabled;
    if (musicEnabled) {
        if (audioCtx.state === 'suspended') audioCtx.resume();
        let step = 0;
        bgmInterval = setInterval(() => {
            if (!musicEnabled) {
                clearInterval(bgmInterval);
                return;
            }
            playBgmNote(bgmSequence[step].f, bgmSequence[step].d);
            step = (step + 1) % bgmSequence.length;
        }, 500);
    } else {
        if (bgmInterval) clearInterval(bgmInterval);
    }
    return musicEnabled;
};

export const toggleSound = () => {
    soundEnabled = !soundEnabled;
    return soundEnabled;
};

export const isSoundEnabled = () => soundEnabled;
export const isMusicEnabled = () => musicEnabled;
