import wave
import struct

print("Starting audio surgical replacement...")

# Target file: /public/assets/aistudio/_1__________fbadfa50.wav (24000Hz, 16-bit mono)
with wave.open('public/assets/aistudio/_1__________fbadfa50.wav', 'rb') as w:
    params = w.getparams()
    nchannels = params.nchannels
    sampwidth = params.sampwidth
    framerate = params.framerate
    nframes = params.nframes
    raw_bytes = w.readframes(nframes)

print(f"Original audio: {nchannels}ch, {framerate}Hz, {sampwidth}B, {nframes} frames ({nframes/framerate:.2f}s)")

# Convert to mutable list or bytearray
audio_samples = list(struct.unpack(f"<{nframes}h", raw_bytes))

fixes = [
    {'wav': 'public/audio/fixed_lines/line_0.wav', 'start_sec': 0.45},
    {'wav': 'public/audio/fixed_lines/line_7.wav', 'start_sec': 38.958},
    {'wav': 'public/audio/fixed_lines/line_11.wav', 'start_sec': 59.678},
    {'wav': 'public/audio/fixed_lines/line_13.wav', 'start_sec': 71.222},
    {'wav': 'public/audio/fixed_lines/line_50.wav', 'start_sec': 248.104},
    {'wav': 'public/audio/fixed_lines/line_80.wav', 'start_sec': 398.074},
    {'wav': 'public/audio/fixed_lines/line_92.wav', 'start_sec': 449.81},
    {'wav': 'public/audio/fixed_lines/line_94.wav', 'start_sec': 462.122},
    {'wav': 'public/audio/fixed_lines/line_101.wav', 'start_sec': 493.52},
    {'wav': 'public/audio/fixed_lines/line_104.wav', 'start_sec': 514.004},
]

for fix in fixes:
    with wave.open(fix['wav'], 'rb') as fw:
        fnframes = fw.getnframes()
        f_raw = fw.readframes(fnframes)
        f_samples = struct.unpack(f"<{fnframes}h", f_raw)

    start_idx = int(fix['start_sec'] * framerate)
    
    # Smooth crossfade 10ms at edges to prevent any click
    fade_len = int(0.01 * framerate) # 240 samples
    
    for i in range(len(f_samples)):
        idx = start_idx + i
        if idx >= len(audio_samples):
            break
        
        # Crossfade at the very beginning
        if i < fade_len and idx < len(audio_samples):
            alpha = i / fade_len
            audio_samples[idx] = int(audio_samples[idx] * (1 - alpha) + f_samples[i] * alpha)
        # Crossfade at the end
        elif i >= len(f_samples) - fade_len and idx < len(audio_samples):
            alpha = (len(f_samples) - i) / fade_len
            audio_samples[idx] = int(audio_samples[idx] * (1 - alpha) + f_samples[i] * alpha)
        else:
            audio_samples[idx] = f_samples[i]

    print(f"Replaced segment at {fix['start_sec']}s with {fix['wav']} ({len(f_samples)/framerate:.2f}s)")

# Write out the corrected clean vocal WAV
out_vocal_wav = 'public/audio/ep01_vocal_fixed_pronunciation.wav'
with wave.open(out_vocal_wav, 'wb') as ow:
    ow.setparams(params)
    packed_bytes = struct.pack(f"<{len(audio_samples)}h", *audio_samples)
    ow.writeframes(packed_bytes)

print(f"Saved corrected pure vocal: {out_vocal_wav}")
