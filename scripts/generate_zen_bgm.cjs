const fs = require('fs');

const SAMPLE_RATE = 44100;
const DURATION = 90.0; // 90-second rich seamless ambient zen loop
const TOTAL_SAMPLES = Math.floor(SAMPLE_RATE * DURATION);

const left = new Float32Array(TOTAL_SAMPLES);
const right = new Float32Array(TOTAL_SAMPLES);

// Pentatonic Frequencies (D major pentatonic / Yu mode - D, E, G, A, B)
const P = {
    'D2': 73.42, 'E2': 82.41, 'G2': 98.00, 'A2': 110.00, 'B2': 123.47,
    'D3': 146.83, 'E3': 164.81, 'G3': 196.00, 'A3': 220.00, 'B3': 246.94,
    'D4': 293.66, 'E4': 329.63, 'G4': 392.00, 'A4': 440.00, 'B4': 493.88,
    'D5': 587.33, 'E5': 659.25, 'G5': 783.99, 'A5': 880.00, 'B5': 987.77,
    'D6': 1174.66
};

// 1. Tibetan Singing Bowl / Temple Bronze Bell (磬 / 頌缽) - Lush & deep
function addSingingBowl(startTime, baseFreq, amp = 0.40, decayTime = 14.0) {
    const startSample = Math.floor(startTime * SAMPLE_RATE);
    const numSamples = Math.floor(decayTime * SAMPLE_RATE);
    const limit = Math.min(numSamples, TOTAL_SAMPLES - startSample);
    
    const partials = [
        { mult: 1.0, amp: 1.0, decay: decayTime },
        { mult: 2.76, amp: 0.65, decay: decayTime * 0.8 },
        { mult: 4.82, amp: 0.35, decay: decayTime * 0.6 },
        { mult: 7.15, amp: 0.18, decay: decayTime * 0.45 },
        { mult: 9.32, amp: 0.08, decay: decayTime * 0.3 }
    ];

    for (let i = 0; i < limit; i++) {
        const t = i / SAMPLE_RATE;
        let valL = 0;
        let valR = 0;

        for (const p of partials) {
            const freq = baseFreq * p.mult;
            const env = Math.exp(-t / (p.decay / 3.6));
            // Meditative binaural beating
            const beatL = 1.0 + 0.18 * Math.sin(2.0 * Math.PI * 0.4 * t);
            const beatR = 1.0 + 0.18 * Math.sin(2.0 * Math.PI * 0.5 * t + 0.9);
            
            valL += Math.sin(2.0 * Math.PI * freq * t) * env * p.amp * beatL;
            valR += Math.sin(2.0 * Math.PI * (freq + 0.4) * t) * env * p.amp * beatR;
        }

        const idx = startSample + i;
        left[idx] += valL * amp;
        right[idx] += valR * amp;
    }
}

// 2. Guqin Pluck (古琴散音/按音/泛音)
function addGuqinPluck(startTime, freq, amp = 0.35, pan = 0.0, harmonic = false) {
    const startSample = Math.floor(startTime * SAMPLE_RATE);
    const N = Math.floor(SAMPLE_RATE / freq);
    if (N <= 1) return;

    const delayLine = new Float32Array(N);
    for (let j = 0; j < N; j++) {
        // Soft pluck excitation
        const noise = (Math.random() * 2.0 - 1.0);
        delayLine[j] = noise * Math.sin(Math.PI * j / N);
    }

    const pluckLen = Math.floor(7.0 * SAMPLE_RATE);
    const limit = Math.min(pluckLen, TOTAL_SAMPLES - startSample);
    let ptr = 0;
    let prevVal = 0;
    const damping = harmonic ? 0.996 : 0.993; // Harmonics ring longer

    const panL = 0.5 * (1.0 - pan);
    const panR = 0.5 * (1.0 + pan);

    for (let i = 0; i < limit; i++) {
        const current = delayLine[ptr];
        const filtered = (current + prevVal) * 0.5 * damping;
        prevVal = current;
        delayLine[ptr] = filtered;
        ptr = (ptr + 1) % N;

        const t = i / SAMPLE_RATE;
        // Warm hollow soundboard body resonance
        const body = 1.0 + 0.3 * Math.sin(2 * Math.PI * 135 * t) * Math.exp(-t * 1.8);
        const outVal = filtered * body * amp;
        const idx = startSample + i;
        left[idx] += outVal * panL;
        right[idx] += outVal * panR;
    }
}

// 3. Bamboo Flute / Xiao (空靈簫笛 - Warm, expressive, breathy vibrato)
function addFlute(startTime, freq, duration, amp = 0.28, pan = 0.1) {
    const startSample = Math.floor(startTime * SAMPLE_RATE);
    const numSamples = Math.floor(duration * SAMPLE_RATE);
    const limit = Math.min(numSamples, TOTAL_SAMPLES - startSample);

    const panL = 0.5 * (1.0 - pan);
    const panR = 0.5 * (1.0 + pan);

    for (let i = 0; i < limit; i++) {
        const t = i / SAMPLE_RATE;
        
        let env = 1.0;
        const attack = 0.4;
        const release = 0.6;
        if (t < attack) {
            env = Math.sin((Math.PI / 2) * (t / attack));
        } else if (t > duration - release) {
            env = Math.sin((Math.PI / 2) * ((duration - t) / release));
        }

        // Lyrical 4.8Hz gentle vibrato
        const vibDepth = (t > 0.4) ? Math.min(1.0, (t - 0.4) * 1.5) * 0.015 : 0;
        const f = freq * (1.0 + vibDepth * Math.sin(2 * Math.PI * 4.8 * t));

        // Rich hollow bamboo harmonics
        const s1 = Math.sin(2 * Math.PI * f * t);
        const s2 = 0.32 * Math.sin(2 * Math.PI * f * 2 * t);
        const s3 = 0.16 * Math.sin(2 * Math.PI * f * 3 * t);
        const s4 = 0.08 * Math.sin(2 * Math.PI * f * 4 * t);
        const breath = (Math.random() * 2.0 - 1.0) * 0.035;

        const val = (s1 + s2 + s3 + s4 + breath) * env * amp;
        const idx = startSample + i;
        left[idx] += val * panL;
        right[idx] += val * panR;
    }
}

// 4. Wind Chime / Glissando Bell (風鈴碎玉)
function addChime(startTime, freq, amp = 0.15, pan = -0.2) {
    const startSample = Math.floor(startTime * SAMPLE_RATE);
    const chimeLen = Math.floor(4.0 * SAMPLE_RATE);
    const limit = Math.min(chimeLen, TOTAL_SAMPLES - startSample);

    for (let i = 0; i < limit; i++) {
        const t = i / SAMPLE_RATE;
        const env = Math.exp(-t * 2.8);
        const val = (Math.sin(2 * Math.PI * freq * t) + 0.35 * Math.sin(2 * Math.PI * freq * 2.41 * t) + 0.15 * Math.sin(2 * Math.PI * freq * 3.8 * t)) * env * amp;
        const idx = startSample + i;
        left[idx] += val * (0.5 * (1 - pan));
        right[idx] += val * (0.5 * (1 + pan));
    }
}

// --- COMPOSE 90-SECOND LUSH ZEN SOUNDSCAPE ---

// Continuous Warm Tanpura/Om Drone & Mountain Stream Whisper
for (let i = 0; i < TOTAL_SAMPLES; i++) {
    const t = i / SAMPLE_RATE;
    const swell = 0.7 + 0.3 * Math.sin(2 * Math.PI * (t / 12.0));
    const d1 = Math.sin(2 * Math.PI * P['D2'] * t) * 0.07;
    const d2 = Math.sin(2 * Math.PI * P['A2'] * t + 0.3) * 0.06;
    const d3 = Math.sin(2 * Math.PI * P['D3'] * t + 0.7) * 0.045;
    const stream = (Math.random() * 2.0 - 1.0) * 0.012 * (0.8 + 0.2 * Math.sin(2 * Math.PI * t / 8.0));

    left[i] += (d1 + d2 * 0.85 + d3 + stream) * swell;
    right[i] += (d1 * 0.85 + d2 + d3 * 0.9 + stream) * swell;
}

// Temple Bowls (every 18 seconds)
addSingingBowl(0.5, P['D3'], 0.45, 14.0);
addSingingBowl(18.0, P['A2'], 0.42, 14.0);
addSingingBowl(36.0, P['G2'], 0.42, 14.0);
addSingingBowl(54.0, P['D3'], 0.45, 14.0);
addSingingBowl(72.0, P['A2'], 0.42, 14.0);

// Rich Continuous Guqin Melody (Pentatonic: D, E, G, A, B)
const GUQIN_MELODY = [
    // Phrase 1 (0-18s)
    { t: 1.5, n: 'D3', pan: -0.2 }, { t: 3.5, n: 'A3', pan: 0.15 }, { t: 5.8, n: 'D4', pan: -0.1 },
    { t: 8.0, n: 'E4', pan: 0.2 }, { t: 10.5, n: 'G4', pan: -0.15 }, { t: 13.0, n: 'A4', pan: 0.1 },
    { t: 15.2, n: 'D4', pan: -0.2 },
    // Phrase 2 (18-36s)
    { t: 19.0, n: 'A2', pan: 0.2 }, { t: 21.5, n: 'E3', pan: -0.15 }, { t: 23.8, n: 'A3', pan: 0.1 },
    { t: 26.2, n: 'B3', pan: -0.2 }, { t: 28.5, n: 'D4', pan: 0.2 }, { t: 31.0, n: 'E4', pan: -0.1 },
    { t: 33.5, n: 'D3', pan: 0.15 },
    // Phrase 3 (36-54s)
    { t: 37.0, n: 'G2', pan: -0.2 }, { t: 39.5, n: 'D3', pan: 0.15 }, { t: 42.0, n: 'G3', pan: -0.1 },
    { t: 44.5, n: 'A3', pan: 0.2 }, { t: 47.0, n: 'B3', pan: -0.15 }, { t: 49.5, n: 'D4', pan: 0.1 },
    { t: 52.0, n: 'E4', pan: -0.2 },
    // Phrase 4 (54-72s)
    { t: 55.0, n: 'D3', pan: 0.2 }, { t: 57.5, n: 'A3', pan: -0.15 }, { t: 60.0, n: 'B3', pan: 0.1 },
    { t: 62.5, n: 'D4', pan: -0.2 }, { t: 65.0, n: 'E4', pan: 0.2 }, { t: 67.5, n: 'G4', pan: -0.1 },
    { t: 70.0, n: 'A4', pan: 0.15 },
    // Phrase 5 (72-90s)
    { t: 73.0, n: 'A2', pan: -0.2 }, { t: 75.5, n: 'E3', pan: 0.15 }, { t: 78.0, n: 'G3', pan: -0.1 },
    { t: 80.5, n: 'A3', pan: 0.2 }, { t: 83.0, n: 'D4', pan: -0.15 }, { t: 86.0, n: 'D3', pan: 0.1 }
];

for (const item of GUQIN_MELODY) {
    if (item.t < DURATION) {
        addGuqinPluck(item.t, P[item.n], 0.38, item.pan);
    }
}

// Lush Lyrical Xiao / Flute Phrases (floating continuously above Guqin)
const FLUTE_MELODIES = [
    { t: 4.5, n: 'D4', dur: 4.0, pan: 0.2 },
    { t: 9.0, n: 'E4', dur: 4.2, pan: 0.15 },
    { t: 13.5, n: 'G4', dur: 5.5, pan: -0.15 },

    { t: 22.0, n: 'A4', dur: 4.5, pan: -0.2 },
    { t: 27.0, n: 'G4', dur: 3.8, pan: 0.1 },
    { t: 31.0, n: 'E4', dur: 5.2, pan: 0.2 },

    { t: 40.0, n: 'D4', dur: 4.2, pan: -0.15 },
    { t: 45.0, n: 'E4', dur: 3.8, pan: -0.2 },
    { t: 49.0, n: 'G4', dur: 5.5, pan: 0.15 },

    { t: 58.0, n: 'A4', dur: 4.5, pan: 0.2 },
    { t: 63.0, n: 'B4', dur: 3.5, pan: -0.1 },
    { t: 67.0, n: 'A4', dur: 5.0, pan: -0.2 },

    { t: 76.0, n: 'G4', dur: 4.2, pan: 0.15 },
    { t: 81.0, n: 'E4', dur: 4.0, pan: -0.15 },
    { t: 85.5, n: 'D4', dur: 4.5, pan: 0.1 }
];

for (const item of FLUTE_MELODIES) {
    if (item.t + item.dur <= DURATION) {
        addFlute(item.t, P[item.n], item.dur, 0.28, item.pan);
    }
}

// Wind Chimes & Glissando Bells
const CHIMES = [
    { t: 7.0, n: 'D5', pan: -0.3 }, { t: 17.5, n: 'A5', pan: 0.35 },
    { t: 25.0, n: 'E5', pan: -0.25 }, { t: 35.5, n: 'G5', pan: 0.3 },
    { t: 43.0, n: 'D6', pan: -0.3 }, { t: 53.5, n: 'A5', pan: 0.35 },
    { t: 61.0, n: 'E5', pan: -0.25 }, { t: 71.5, n: 'G5', pan: 0.3 },
    { t: 79.0, n: 'D5', pan: -0.3 }, { t: 87.0, n: 'A5', pan: 0.3 }
];
for (const item of CHIMES) {
    if (item.t < DURATION) {
        addChime(item.t, P[item.n], 0.18, item.pan);
    }
}

// Seamless crossfade loop window (last 3.5 seconds crossfade into first 3.5 seconds)
const fadeSamples = Math.floor(3.5 * SAMPLE_RATE);
for (let i = 0; i < fadeSamples; i++) {
    const alpha = i / fadeSamples;
    const endIdx = TOTAL_SAMPLES - fadeSamples + i;
    const startL = left[i];
    const startR = right[i];
    const endL = left[endIdx];
    const endR = right[endIdx];

    left[i] = startL * alpha + endL * (1 - alpha);
    right[i] = startR * alpha + endR * (1 - alpha);
    left[endIdx] = left[i];
    right[endIdx] = right[i];
}

// Normalize to solid, broadcast-ready volume (-1.5dB peak)
let maxVal = 0.001;
for (let i = 0; i < TOTAL_SAMPLES; i++) {
    maxVal = Math.max(maxVal, Math.abs(left[i]), Math.abs(right[i]));
}
const scale = 0.85 / maxVal;

// Export WAV
const buffer = Buffer.alloc(44 + TOTAL_SAMPLES * 4);
buffer.write('RIFF', 0);
buffer.writeUInt32LE(36 + TOTAL_SAMPLES * 4, 4);
buffer.write('WAVE', 8);
buffer.write('fmt ', 12);
buffer.writeUInt32LE(16, 16);
buffer.writeUInt16LE(1, 20); // PCM
buffer.writeUInt16LE(2, 22); // Stereo
buffer.writeUInt32LE(SAMPLE_RATE, 24);
buffer.writeUInt32LE(SAMPLE_RATE * 4, 28);
buffer.writeUInt16LE(4, 32);
buffer.writeUInt16LE(16, 34);
buffer.write('data', 36);
buffer.writeUInt32LE(TOTAL_SAMPLES * 4, 40);

let offset = 44;
for (let i = 0; i < TOTAL_SAMPLES; i++) {
    let sL = Math.max(-1, Math.min(1, left[i] * scale));
    let sR = Math.max(-1, Math.min(1, right[i] * scale));
    buffer.writeInt16LE(Math.floor(sL * 32767), offset);
    buffer.writeInt16LE(Math.floor(sR * 32767), offset + 2);
    offset += 4;
}

const outDir = 'public/audio';
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
const outPath = `${outDir}/zen_meditation_bgm_master.wav`;
fs.writeFileSync(outPath, buffer);
console.log(`Generated Lush Zen BGM: ${outPath} (${DURATION}s, scale=${scale.toFixed(3)})`);
