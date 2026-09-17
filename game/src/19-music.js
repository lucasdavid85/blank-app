/* 19-music.js
   A small generative soundtrack and a couple of sound effects — no audio
   files shipped, just oscillators and noise bursts sequenced on the Web
   Audio clock, so the campus has sound without needing licensed assets.
   Music starts off; the player switches it on. The driving arpeggio, four-
   on-the-floor kick and off-beat hats are a nod to Geometry Dash's style
   of rhythm-driven electronic backing track.

   Part of Valrose Kart. Loaded as a plain script in the order set by
   index.html, so everything shares one global scope — no bundler needed. */

let audioCtx = null, musicGain = null, sfxGain = null, noiseBuffer = null;
let musicOn = false, musicTimer = null;
let nextNoteTime = 0, stepIndex = 0;

const MUSIC_ROOT = 196;                        // G3 — a bit brighter than a straight A minor
const MUSIC_SCALE = [0, 3, 5, 7, 10, 12, 15, 19];  // minor pentatonic, extended
const STEP_DUR = 0.1171875;                    // one sixteenth note at 128 bpm
const BASS_PATTERN  = [0, 7, 5, 7, 3, 7, 5, 7, 0, 7, 5, 7, 3, 7, 5, 10];
const LEAD_PATTERN  = [null,null,12,null, null,15,null,12, null,null,10,null, 12,10,7,null];
const KICK_STEPS = [0, 4, 8, 12];
const HAT_STEPS  = [2, 6, 10, 14];

function ensureAudio() {
  if (typeof window === 'undefined' || !(window.AudioContext || window.webkitAudioContext)) return null;
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    musicGain = audioCtx.createGain(); musicGain.gain.value = .4;
    musicGain.connect(audioCtx.destination);
    sfxGain = audioCtx.createGain(); sfxGain.gain.value = .7;
    sfxGain.connect(audioCtx.destination);
    noiseBuffer = audioCtx.createBuffer(1, audioCtx.sampleRate * .2, audioCtx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  }
  if (audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
}

function noteFreq(semitones) { return MUSIC_ROOT * Math.pow(2, semitones / 12); }
function scaleNote(step) {
  const n = MUSIC_SCALE.length, i = ((step % n) + n) % n;
  return MUSIC_SCALE[i] + Math.floor(step / n) * 12;
}
function playTone(time, freq, dur, gain, type, dest) {
  const osc = audioCtx.createOscillator(), g = audioCtx.createGain();
  osc.type = type; osc.frequency.setValueAtTime(freq, time);
  g.gain.setValueAtTime(0, time);
  g.gain.linearRampToValueAtTime(gain, time + .008);
  g.gain.exponentialRampToValueAtTime(.0001, time + dur);
  osc.connect(g); g.connect(dest || musicGain);
  osc.start(time); osc.stop(time + dur + .05);
}
function playKick(time) {
  const osc = audioCtx.createOscillator(), g = audioCtx.createGain();
  osc.type = 'sine'; osc.frequency.setValueAtTime(155, time);
  osc.frequency.exponentialRampToValueAtTime(42, time + .11);
  g.gain.setValueAtTime(.85, time); g.gain.exponentialRampToValueAtTime(.001, time + .17);
  osc.connect(g); g.connect(musicGain); osc.start(time); osc.stop(time + .18);
}
function playHat(time, open) {
  const src = audioCtx.createBufferSource(); src.buffer = noiseBuffer;
  const hp = audioCtx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 7000;
  const g = audioCtx.createGain(); const dur = open ? .11 : .045;
  g.gain.setValueAtTime(.16, time); g.gain.exponentialRampToValueAtTime(.001, time + dur);
  src.connect(hp); hp.connect(g); g.connect(musicGain);
  src.start(time); src.stop(time + dur + .02);
}
function scheduleStep(time, step, bar) {
  if (KICK_STEPS.includes(step)) playKick(time);
  if (HAT_STEPS.includes(step)) playHat(time, step === 14 && bar % 2 === 1);
  // A continuously running 16th-note arpeggio drives the track forward —
  // the defining Geometry Dash trait — with a lead stab layered on top.
  playTone(time, noteFreq(scaleNote(BASS_PATTERN[step]) - 12), STEP_DUR * .92, .16, 'sawtooth');
  const lead = LEAD_PATTERN[step];
  if (lead !== null) playTone(time, noteFreq(lead), STEP_DUR * 1.6, .11, 'square');
  if (step === 0) playTone(time, noteFreq(scaleNote(0) - 24), STEP_DUR * 4, .2, 'triangle');
}
function musicScheduler() {
  if (!musicOn) return;
  while (nextNoteTime < audioCtx.currentTime + .2) {
    const step = stepIndex % 16;
    scheduleStep(nextNoteTime, step, Math.floor(stepIndex / 16));
    nextNoteTime += STEP_DUR; stepIndex++;
  }
}
function toggleMusic() {
  if (!ensureAudio()) return;
  musicOn = !musicOn;
  const btn = el('toggle-music');
  btn.setAttribute('aria-pressed', String(musicOn));
  btn.title = musicOn ? 'Music: on (click to mute)' : 'Music: off (click to play)';
  clearInterval(musicTimer);
  if (musicOn) {
    stepIndex = 0; nextNoteTime = audioCtx.currentTime + .05;
    musicScheduler(); musicTimer = setInterval(musicScheduler, 100);
  }
}
el('toggle-music')?.addEventListener('click', toggleMusic);

/* A comic double-honk, synthesized the same way as the music — no audio
   file — played the instant a goose actually bumps the kart. */
function playGooseHonk() {
  if (!ensureAudio()) return;
  const t = audioCtx.currentTime;
  for (let i = 0; i < 2; i++) {
    const start = t + i * .13;
    const osc = audioCtx.createOscillator(), g = audioCtx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(360, start);
    osc.frequency.exponentialRampToValueAtTime(180, start + .1);
    g.gain.setValueAtTime(0, start);
    g.gain.linearRampToValueAtTime(.55, start + .012);
    g.gain.exponentialRampToValueAtTime(.001, start + .13);
    osc.connect(g); g.connect(sfxGain);
    osc.start(start); osc.stop(start + .15);
  }
}
