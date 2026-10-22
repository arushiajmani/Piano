"use strict";

const DEFAULT_VOLUME = 0.8;
const KEYBOARD_MID_HZ = 400;
const FREQ_MIN = 20;
const FREQ_MAX = 20000;
const SPECTROGRAM_IDLE_MS = 1800;

let audioContext = null;
let gainNode = null;
let analyserNode = null;
let audioGraphReady = false;
let currentVolume = DEFAULT_VOLUME;

let isRecording = false;
let isReplaying = false;
let sequence = [];
let lastRecordedAt = 0;
let replayTimers = [];

let spectrogramRaf = 0;
let spectrogramIdleTimer = 0;
let freqData = null;

function playNote(e) {
  if (e.type === "keydown" && shouldIgnorePianoKeys(e.target)) {
    return;
  }

  const key = getKey(e);
  const keyElement = document.querySelector(`div[data-key = "${key}"`);

  // if the key is exist, & not null
  if (keyElement) {
    triggerNote(keyElement, false);
  }
}

function triggerNote(keyElement, fromReplay) {
  ensureAudioGraph();
  playAudio(keyElement.dataset.key);
  addPlayingClass(keyElement);
  showNote(keyElement);
  updateHearing(keyElement);
  startSpectrogram();

  if (isRecording && !fromReplay) {
    const now = performance.now();
    const delayMs = sequence.length === 0 ? 0 : now - lastRecordedAt;
    lastRecordedAt = now;
    sequence.push({ key: keyElement.dataset.key, delayMs });
    updateSequenceUi();
  }
}

function shouldIgnorePianoKeys(target) {
  if (!target) {
    return false;
  }
  if (target.id === "volume" || target.closest("#volume")) {
    return true;
  }
  if (target.closest("dialog") || target.closest("button")) {
    return true;
  }
  const dialog = document.getElementById("spectrum-info");
  return Boolean(dialog && dialog.open);
}

function getKey(e) {
  let key = "";
  if (e.type === "keydown") {
    key = e.keyCode;
  } else {
    const keyEl = e.target.closest(".key");
    if (!keyEl) {
      return "";
    }
    key = keyEl.dataset.key;
  }
  return key;
}

function showNote(element) {
  const note = document.querySelector(".note");
  note.textContent = element.dataset.note;
  note.style.opacity = "1";
}

function playAudio(key) {
  const audio = document.querySelector(`audio[data-key="${key}"]`);
  if (!audio) {
    return;
  }
  audio.volume = currentVolume;
  audio.currentTime = 0;
  audio.play();
}

function addPlayingClass(element) {
  element.classList.add("playing");
}

function removePlayingClass(element) {
  element.classList.remove("playing");
}

function ensureAudioGraph() {
  if (audioGraphReady) {
    if (audioContext && audioContext.state === "suspended") {
      audioContext.resume();
    }
    return;
  }

  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) {
    return;
  }

  audioContext = new AudioCtx();
  gainNode = audioContext.createGain();
  gainNode.gain.value = currentVolume;
  analyserNode = audioContext.createAnalyser();
  analyserNode.fftSize = 2048;
  analyserNode.smoothingTimeConstant = 0.7;
  freqData = new Uint8Array(analyserNode.frequencyBinCount);

  gainNode.connect(analyserNode);
  analyserNode.connect(audioContext.destination);

  document.querySelectorAll("audio").forEach((audio) => {
    const source = audioContext.createMediaElementSource(audio);
    source.connect(gainNode);
  });

  audioGraphReady = true;
}

function setVolume(value) {
  currentVolume = Number(value);
  if (gainNode) {
    gainNode.gain.value = currentVolume;
  }
  document.querySelectorAll("audio").forEach((audio) => {
    audio.volume = currentVolume;
  });
  const volumeValue = document.getElementById("volume-value");
  if (volumeValue) {
    volumeValue.textContent = `${Math.round(currentVolume * 100)}%`;
  }
}

window.addEventListener("load", registerEvents);

function registerEvents() {
  //click with mouse
  const piano = document.querySelector(".piano");
  piano.addEventListener("click", playNote);
  //keyboard
  window.addEventListener("keydown", playNote);
  //remove playing class when transition end
  piano.addEventListener("transitionend", function (e) {
    //if the transition is on the span element, on hover, return
    if (e.target.tagName === "SPAN") {
      return;
    }
    //if the transition is when a key is active
    removePlayingClass(e.target);
  });
  //add transition delay on hover to span elements, depending on the index of the element
  const keyNames = piano.querySelectorAll("span");
  keyNames.forEach((item, index) => {
    item.style.transitionDelay = `${index * 60}ms`;
  });

  const volumeSlider = document.getElementById("volume");
  if (volumeSlider) {
    setVolume(volumeSlider.value);
    volumeSlider.addEventListener("input", function () {
      setVolume(volumeSlider.value);
    });
  }

  const recordBtn = document.getElementById("record-btn");
  const playBtn = document.getElementById("play-btn");
  if (recordBtn) {
    recordBtn.addEventListener("click", toggleRecording);
  }
  if (playBtn) {
    playBtn.addEventListener("click", playLastSequence);
  }
  updateSequenceUi();
  fillSpectrogramBackground();
  drawCochlea(null);
  registerSpectrumInfo();
}

function registerSpectrumInfo() {
  const openBtn = document.getElementById("spectrum-info-btn");
  const closeBtn = document.getElementById("spectrum-info-close");
  const dialog = document.getElementById("spectrum-info");
  if (!openBtn || !dialog) {
    return;
  }

  openBtn.addEventListener("click", function () {
    if (typeof dialog.showModal === "function") {
      dialog.showModal();
    }
  });
  if (closeBtn) {
    closeBtn.addEventListener("click", function () {
      dialog.close();
    });
  }
}

function toggleRecording() {
  if (isRecording) {
    isRecording = false;
    updateSequenceUi();
    return;
  }

  stopReplay();
  isRecording = true;
  sequence = [];
  lastRecordedAt = 0;
  updateSequenceUi();
}

function playLastSequence() {
  if (isRecording || isReplaying || sequence.length === 0) {
    return;
  }

  isReplaying = true;
  updateSequenceUi();

  let elapsed = 0;
  sequence.forEach((event, index) => {
    elapsed += event.delayMs;
    const timer = setTimeout(() => {
      const keyElement = document.querySelector(
        `div[data-key="${event.key}"]`
      );
      if (keyElement) {
        triggerNote(keyElement, true);
      }
      if (index === sequence.length - 1) {
        isReplaying = false;
        updateSequenceUi();
      }
    }, elapsed);
    replayTimers.push(timer);
  });
}

function stopReplay() {
  replayTimers.forEach((timer) => clearTimeout(timer));
  replayTimers = [];
  isReplaying = false;
}

function updateSequenceUi() {
  const recordBtn = document.getElementById("record-btn");
  const playBtn = document.getElementById("play-btn");
  const status = document.getElementById("sequence-status");
  if (!recordBtn || !playBtn || !status) {
    return;
  }

  recordBtn.textContent = isRecording ? "Stop" : "Record";
  recordBtn.classList.toggle("recording", isRecording);
  playBtn.disabled = isRecording || isReplaying || sequence.length === 0;

  if (isRecording) {
    status.textContent =
      sequence.length === 0
        ? "Recording…"
        : `Recording… ${sequence.length} notes`;
    return;
  }
  if (isReplaying) {
    status.textContent = "Playing back…";
    return;
  }
  if (sequence.length === 0) {
    status.textContent = "No sequence yet";
    return;
  }
  status.textContent = `${sequence.length} notes saved`;
}

function updateHearing(keyElement) {
  const freq = Number(keyElement.dataset.freq);
  const note = keyElement.dataset.note;
  drawCochlea({ freq, note });

  const placeCaption = document.getElementById("place-caption");
  const filterAnalogy = document.getElementById("filter-analogy");
  if (placeCaption && Number.isFinite(freq)) {
    placeCaption.textContent = `${note} · ${freq.toFixed(1)} Hz peaks here on the membrane`;
  }
  if (filterAnalogy && Number.isFinite(freq)) {
    const apical = freq < KEYBOARD_MID_HZ;
    filterAnalogy.classList.toggle("is-apical", apical);
    filterAnalogy.classList.toggle("is-basal", !apical);
    filterAnalogy.textContent = apical
      ? "Apical (this keyboard): lower notes — apex / low-pass analogy"
      : "Basal (this keyboard): higher notes — base / high-pass analogy";
  }
}

function greenwoodFractionFromApex(freq) {
  const A = 165.4;
  const k = 0.88;
  const pos = (f) => Math.log10(f / A + k);
  const clamped = Math.min(FREQ_MAX, Math.max(FREQ_MIN, freq));
  return (pos(clamped) - pos(FREQ_MIN)) / (pos(FREQ_MAX) - pos(FREQ_MIN));
}

function drawCochlea(peak) {
  const canvas = document.getElementById("cochlea");
  if (!canvas) {
    return;
  }
  const ctx = canvas.getContext("2d");
  const width = canvas.width;
  const height = canvas.height;
  ctx.fillStyle = "#182438";
  ctx.fillRect(0, 0, width, height);

  const gradient = ctx.createLinearGradient(0, 0, width, 0);
  gradient.addColorStop(0, "#3d5578");
  gradient.addColorStop(1, "#a9bedd");
  const bandTop = Math.max(14, Math.round(height * 0.28));
  const bandHeight = Math.max(18, Math.round(height * 0.38));
  ctx.fillStyle = gradient;
  ctx.fillRect(12, bandTop, width - 24, bandHeight);

  ctx.fillStyle = "#a9bedd";
  ctx.font = "11px 'IBM Plex Mono', monospace";
  ctx.fillText("20 Hz", 12, 12);
  ctx.textAlign = "right";
  ctx.fillText("20 kHz", width - 12, 12);
  ctx.textAlign = "left";
  ctx.fillText("apex", 12, height - 6);
  ctx.textAlign = "right";
  ctx.fillText("base", width - 12, height - 6);
  ctx.textAlign = "left";

  if (peak && Number.isFinite(peak.freq)) {
    const x = 12 + greenwoodFractionFromApex(peak.freq) * (width - 24);
    ctx.strokeStyle = "#d7e4f5";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x, bandTop - 4);
    ctx.lineTo(x, bandTop + bandHeight + 4);
    ctx.stroke();
    ctx.fillStyle = "#d7e4f5";
    ctx.font = "500 12px 'IBM Plex Mono', monospace";
    ctx.textAlign = "center";
    ctx.fillText(peak.note, x, bandTop - 6);
    ctx.textAlign = "left";
  }
}

function fillSpectrogramBackground() {
  const canvas = document.getElementById("spectrogram");
  if (!canvas) {
    return;
  }
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#182438";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function startSpectrogram() {
  if (!analyserNode) {
    return;
  }
  window.clearTimeout(spectrogramIdleTimer);
  spectrogramIdleTimer = window.setTimeout(stopSpectrogram, SPECTROGRAM_IDLE_MS);
  if (spectrogramRaf) {
    return;
  }
  drawSpectrogramFrame();
}

function stopSpectrogram() {
  if (spectrogramRaf) {
    cancelAnimationFrame(spectrogramRaf);
    spectrogramRaf = 0;
  }
}

function drawSpectrogramFrame() {
  const canvas = document.getElementById("spectrogram");
  if (!canvas || !analyserNode || !freqData) {
    spectrogramRaf = 0;
    return;
  }
  const ctx = canvas.getContext("2d");
  analyserNode.getByteFrequencyData(freqData);

  ctx.drawImage(canvas, -1, 0);
  const x = canvas.width - 1;
  const nyquist = audioContext.sampleRate / 2;
  for (let y = 0; y < canvas.height; y += 1) {
    const freq = FREQ_MIN * Math.pow(FREQ_MAX / FREQ_MIN, 1 - y / canvas.height);
    const bin = Math.min(
      freqData.length - 1,
      Math.round((freq / nyquist) * freqData.length)
    );
    const mag = freqData[bin] / 255;
    const r = Math.round(24 + mag * 100);
    const g = Math.round(36 + mag * 155);
    const b = Math.round(56 + mag * 190);
    ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
    ctx.fillRect(x, y, 1, 1);
  }

  spectrogramRaf = requestAnimationFrame(drawSpectrogramFrame);
}
