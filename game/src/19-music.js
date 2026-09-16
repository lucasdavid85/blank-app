/* 19-music.js
   A small generative soundtrack — no audio files shipped, just a handful of
   oscillators sequenced on the Web Audio clock — so the campus has music
   without needing a licensed track. Starts off; the player switches it on.

   Part of Valrose Kart. Loaded as a plain script in the order set by
   index.html, so everything shares one global scope — no bundler needed. */

let audioCtx = null, musicGain = null, musicOn = false, musicTimer = null;
let nextNoteTime = 0, stepIndex = 0;

const MUSIC_ROOT = 220;                       // A3
const MUSIC_SCALE = [0, 3, 5, 7, 10, 12, 15];  // A minor pentatonic, two octaves
const STEP_DUR = 0.24;                        // one sixteenth note at ~104 bpm
const LEAD_PATTERN = [0, 2, 4, 2, 5, 4, 2, 0, 3, 5, 7, 5, 4, 2, 0, -3];

function noteFreq(semitones) { return MUSIC_ROOT * Math.pow(2, semitones / 12); }
function scaleNote(step) {
  const n = MUSIC_SCALE.length, i = ((step % n) + n) % n;
  return MUSIC_SCALE[i] + Math.floor(step / n) * 12;
}
function playTone(time, freq, dur, gain, type) {
  const osc = audioCtx.createOscillator(), g = audioCtx.createGain();
  osc.type = type; osc.frequency.setValueAtTime(freq, time);
  g.gain.setValueAtTime(0, time);
  g.gain.linearRampToValueAtTime(gain, time + .015);
  g.gain.exponentialRampToValueAtTime(.0001, time + dur);
  osc.connect(g); g.connect(musicGain);
  osc.start(time); osc.stop(time + dur + .05);
}
function scheduleStep(time, bar) {
  if (bar % 4 === 0) playTone(time, noteFreq(scaleNote(0) - 12), STEP_DUR * 3.6, .22, 'triangle');
  const raw = LEAD_PATTERN[bar];
  if (bar % 2 === 0 || bar % 3 === 0) playTone(time, noteFreq(scaleNote(raw) + 12), STEP_DUR * .9, .1, 'square');
}
function musicScheduler() {
  if (!musicOn) return;
  while (nextNoteTime < audioCtx.currentTime + .2) {
    scheduleStep(nextNoteTime, stepIndex % 16);
    nextNoteTime += STEP_DUR; stepIndex++;
  }
}
function toggleMusic() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    musicGain = audioCtx.createGain(); musicGain.gain.value = .45;
    musicGain.connect(audioCtx.destination);
  }
  musicOn = !musicOn;
  el('toggle-music').textContent = 'Music: ' + (musicOn ? 'on' : 'off');
  el('toggle-music').setAttribute('aria-pressed', String(musicOn));
  clearInterval(musicTimer);
  if (musicOn) {
    audioCtx.resume();
    stepIndex = 0; nextNoteTime = audioCtx.currentTime + .05;
    musicScheduler(); musicTimer = setInterval(musicScheduler, 100);
  }
}
el('toggle-music')?.addEventListener('click', toggleMusic);
