const fs = require('fs');
const { execSync } = require('child_process');

console.log('--- Step 1: Concatenate Main Narration with Outro CTA ---');

// Main narration duration: 611.78s
// Insert a 1.2s silence before outro CTA
// Outro CTA duration: 6.72s
// Total vocal duration: 611.78 + 1.2 + 6.72 = 619.7s

const concatFilter = `
ffmpeg -y \
  -i public/assets/aistudio/_1__________d8b41b3d.mp3 \
  -f lavfi -t 1.2 -i anullsrc=r=24000:cl=mono \
  -i public/audio/outro_cta/audio.mp3 \
  -filter_complex "[0:a][1:a][2:a]concat=n=3:v=0:a=1[vocal_out]" \
  -map "[vocal_out]" -c:a libmp3lame -b:a 192k public/audio/ep01_vocal_full_with_outro.mp3
`;

console.log('Running vocal concatenation...');
execSync(concatFilter);
console.log('Vocal concatenated successfully.');

console.log('--- Step 2: Mix with Zen Meditation BGM (with gentle ducking & fade-out) ---');
// BGM starts at 0s with 2.5s fade in.
// Vocal starts around 0.45s.
// Vocal ends at ~619.7s.
// BGM lingers and fades out from 620.0s to 624.0s (4s fade-out).
// Total length: 624.0s (10m 24s).

const mixCommand = `
ffmpeg -y \
  -i public/audio/ep01_vocal_full_with_outro.mp3 \
  -stream_loop -1 -i public/audio/zen_meditation_bgm_master.wav \
  -filter_complex "\
    [1:a]volume=0.17,afade=t=in:st=0:d=3,afade=t=out:st=620:d=4,atrim=0:624[bgm]; \
    [0:a]volume=1.08,highpass=f=75[voc]; \
    [voc][bgm]amix=inputs=2:duration=longest:dropout_transition=3[aout]" \
  -map "[aout]" -c:a libmp3lame -b:a 320k public/dengxia_preview/ep01_baimi_master_with_outro_and_zen.mp3
`;

console.log('Running final broadcast master mix...');
execSync(mixCommand);
console.log('Master mixed successfully: public/dengxia_preview/ep01_baimi_master_with_outro_and_zen.mp3');

// Also export as WAV for editing software (Premiere / CapCut / Final Cut Pro)
const wavCommand = `
ffmpeg -y -i public/dengxia_preview/ep01_baimi_master_with_outro_and_zen.mp3 -c:a pcm_s16le -ar 44100 public/dengxia_preview/ep01_baimi_master_with_outro_and_zen.wav
`;
execSync(wavCommand);
console.log('WAV master exported: public/dengxia_preview/ep01_baimi_master_with_outro_and_zen.wav');
