# Pianoforte — project notebook

Use this file as the source of truth for **what the project is**, **how to talk about it**, and **what changed**. Update the **Change log** at the bottom whenever you ship something.

The short GitHub/portfolio blurb lives in `README.md`. This notebook is for you.

---

## One-sentence pitch

**Pianoforte** is a salon-style browser piano: play C4–E5 from mouse or keyboard, record a phrase, and watch a spectrogram plus a cochlear place map of the same WAV.

**For interviews / demos:** “Pianoforte is a vanilla HTML/CSS/JS instrument. Keys are real samples, not a synth. Mouse, keyboard, and sequence replay share one playback path. Volume is a GainNode. The panel on the right is a software hearing map — spectrogram from an AnalyserNode, place pitch on a Greenwood-style basilar strip. No headset, not a BCI.”

---

## What it does (user-facing)

| Action | Result |
| --- | --- |
| Click a white or black key | Plays that note, presses the key visually, shows the note name at the bottom |
| Press a mapped keyboard key | Same as clicking that piano key |
| Drag the volume slider | Sets loudness (0–100%). Arrow keys on the slider move volume, not piano keys |
| Record / Stop | Captures the latest note sequence (timing included). A new Record run replaces the previous one |
| Play last sequence | Replays saved notes through the same playback path; replay is not re-recorded |
| Play any note (including replay) | Spectrogram scrolls; cochlear marker moves; apical vs basal caption updates |
| Click the **i** on Spectrogram | Opens a dialog that explains axes, FFT, harmonics, and that this is a model not a sensor |
| Hover the piano | Note names and keyboard shortcuts fade in, staggered left to right |
| Release / after the press animation | The “playing” highlight is removed |

Range: **C4 through E5** (17 keys: 10 white, 7 black). Hints and the large note name use octave-qualified labels so the two C keys are distinct.

Keyboard map (printed under the piano):

- White: `A S D F G H J K L ;`
- Black: `W E T Y U O P`

The last white key is wired to key code `186` (semicolon on US layouts). Each key also has `data-freq` in Hz (A4 = 440). WAV filenames `040.wav`–`056.wav` are sample IDs, not MIDI numbers.

---

## Tech stack

No framework, no build step, no package manager.

| Layer | What | Why it is here |
| --- | --- | --- |
| Markup | HTML5 (`index.html`) | Keys, labels, and `<audio>` tags |
| Style | CSS3 (`style.css`) | Layout, white/black keys, hover hints, press animation |
| Behavior | Vanilla JS (`script.js`) | Click + `keydown`, play audio, volume, record/replay, spectrogram, place map |
| Sound | 17 WAV files in `audio/` | One sample per key (`040.wav` … `056.wav`) |
| Font | Google Fonts DM Sans, Inter, IBM Plex Mono | Headings DM Sans; body Inter; notes / Hz / key maps IBM Plex Mono |

**Concepts this project is meant to show:** DOM queries, event bubbling, event delegation (one click listener on `.piano`), keyboard events, CSS transitions, `data-*` attributes as a join key between UI and audio.

---

## File map — where things happen

```
Piano/
├── index.html      # Page structure: header, toolbar, keys, note display, hearing panel, audio tags
├── style.css       # Look, toolbar, hearing panel, and press/hover animation
├── script.js       # All interaction logic
├── audio/          # WAV samples, one per key
├── favicon.ico
├── bg_image.png    # Cool abstract icy-blue background
├── preview.png     # README screenshot
├── README.md       # Public short description
└── PROJECT.md      # This notebook
```

### `index.html`

- Product header: name **Pianoforte**, tagline, volume, Record / Play.
- Under the piano: current note plus the keyboard legend.
- Hearing panel (right column on desktop): spectrogram with an **i** button, uncoiled cochlea canvas, apical/basal caption.
- `#spectrum-info` dialog: what the spectrogram is (copy is also in **Explain the spectrogram** below).
- Each piano key is a `.key` with:
  - `data-note` — octave-qualified name shown on screen (`C4`, `C#4`, … `E5`)
  - `data-freq` — nominal frequency in Hz (A4 = 440)
  - `data-keyboard` — letter for hints
  - `data-key` — numeric key code; **same number** is on the matching `<audio>`
- Keys are grouped in `.keys` columns so a black key can sit on top of the white key to its left.
- Hidden `<audio>` elements in `.audios` hold the samples.

### `style.css`

- Full-page cool abstract background (`bg_image.png`). Translucent white panels, slate text, icy-blue accents. Headings DM Sans, body Inter, notes/Hz/key maps IBM Plex Mono. Piano case is navy; ivory and charcoal keys; muted blue press glow. Visualizations sit on `#182438`.
- White keys fill a column; black keys are `position: absolute` overlapping the next column.
- `.playing` scales the key slightly and adds a blue glow.
- Hint `<span>`s start at `opacity: 0` and appear when `.piano:hover`.
- Stacks to one column under `980px`.

### `script.js` (runtime flow)

1. On `window` `load`, `registerEvents()` attaches listeners.
2. Click on `.piano` **or** `keydown` on `window` both call `playNote`.
3. `getKey` reads `e.keyCode` for keyboard, or `closest(".key").dataset.key` for mouse.
4. If a matching key exists:
   - `ensureAudioGraph` creates one `AudioContext` on first gesture: `HTMLMediaElement` sources → `GainNode` → `AnalyserNode` (fftSize 2048) → speakers.
   - `playAudio` finds `audio[data-key="…"]`, rewinds (`currentTime = 0`), plays.
   - `addPlayingClass` adds `.playing`.
   - `showNote` writes `data-note` into `.note` and makes it visible.
5. When the CSS transition on a key ends, `.playing` is removed (span hover transitions are ignored).
6. On load, each hint span gets a staggered `transition-delay` (`index * 60ms`). The volume slider writes `gain.gain` (and `audio.volume` before the graph exists). Keyboard events on the slider are not treated as piano keys.
7. Record stores `{ key, delayMs }` from user `playNote` calls. Play walks that array with timeouts and calls `triggerNote(..., true)` so playback is not appended to the sequence.
8. `updateHearing` places a marker on an uncoiled basilar-membrane strip with a Greenwood-style log axis (20 Hz apex → 20 kHz base) using `data-freq`. Caption is apical vs basal relative to ~400 Hz on this keyboard. Spectrogram scrolls FFT columns from the analyser while notes play.
9. The **i** button calls `dialog.showModal()` on `#spectrum-info`. Piano `keydown` is ignored while the dialog is open or while focus is on a button / the volume slider.

**Join key:** `data-key` on both the key `div` and the `<audio>` tag. Pitch education uses `data-note` + `data-freq` (A4 = 440), not the WAV filenames.

---

## Run locally (commands)

No install, no build. From a terminal:

```bash
cd /home/arushi/tech/Piano
python3 -m http.server 8000
```

Then open:

```
http://localhost:8000
```

Stop the server with `Ctrl+C`.

If port 8000 is already in use:

```bash
python3 -m http.server 8080
```

Then open `http://localhost:8080`.

Optional: open the page from the terminal after the server is running:

```bash
xdg-open http://localhost:8000
```

You can also double-click `index.html` or run:

```bash
xdg-open index.html
```

A local server (`python3 -m http.server`) is the more reliable demo: some browsers block audio when the page is opened as a `file://` URL.

---

## How to present it (talk track)

1. **Product:** Pianoforte — not a JS tutorial page. Open it, name it, play two notes, then hit **i** on the spectrogram if they ask what the graph is.
2. **Demo:** Mouse a short melody, then the same notes on the keyboard. Volume. Record a phrase and Play. C4 then E5: marker moves toward the base; spectrogram lights the fundamental plus harmonics.
3. **Architecture (30 seconds):** HTML describes keys and samples. CSS is the instrument body. JS never hard-codes note names for playback — it looks up `data-key`. Volume is one GainNode; the analyser taps that same graph. The hearing panel is a model, not neural data.
4. **Design choices:** One listener on the piano (delegation) instead of 17 click handlers. Rewind audio so rapid repeats work. Visual state is CSS (`.playing`), not a JS animation loop.
5. **Honest limits:** Vanilla only; `keyCode` is deprecated; no sustain/velocity; samples are files not synthesis; semicolon is layout-specific (`keyCode` 186).

6. **Demo:** use **Run locally** above. Do not rely on a hosted URL.

## Explain the spectrogram (what the **i** button says)

Use this if someone asks “what is that graph?” — same story as the in-app dialog.

- **What it is:** A picture of the *played audio over time*, not a picture of the room. First key press builds `MediaElementSource → GainNode → AnalyserNode (fftSize 2048) → speakers`. Each animation frame, one new column is drawn on the **right** and the older image is shifted left (`drawImage(canvas, -1, 0)`).
- **Axes:** Vertical = frequency on a **log** scale (~20 kHz at the **top**, ~20 Hz at the **bottom**). Horizontal = time. Color = energy in that FFT bin (brighter = louder in that band).
- **Why a note is a stack, not a line:** A piano sample has a **fundamental** (the named pitch, A4 = 440 Hz) plus quieter **harmonics** above it. A sine wave would be a single band.
- **Link to the strip below:** Greenwood-style uncoiled **basilar membrane**. Low frequencies peak toward the **apex** (left); high toward the **base** (right). On this keyboard, below ~400 Hz is labeled apical, above is basal. Play C4 (261.63 Hz) then E5 (659.25 Hz).
- **What it is not:** Not a microphone of the room, not EEG/BCI, not a clinical hearing test. Software model of place pitch using the same WAVs.

---

## Current known quirks (fix or mention)

- `e.keyCode` is deprecated; modern code uses `e.code` or `e.key`.
- Clicking a nested `<span>` still works because of `closest(".key")`.
- Hover hints use CSS; the JS delay is extra polish.
- Headings use DM Sans; body uses Inter; note names, frequencies, and keyboard maps use IBM Plex Mono.
- No octave shift or sustain pedal. Only the latest recorded sequence is kept.
- Hearing panel is educational (place pitch / filter analogy), not a clinical or BCI device.
- `playAudio` returns early if no matching `<audio>` is found.

---

## How to keep this file useful

When you change the project:

1. Add a dated row in **Change log** (what / why / files).
2. If behavior or stack changed, edit the tables above so they stay true.
3. If you add a file, add it to **File map**.
4. Keep `README.md` short for visitors; put the long story here.

Template for a log entry:

```
### YYYY-MM-DD — short title
- **What:** …
- **Why:** …
- **Files:** …
- **How to show it:** …
```

---

## Change log

### Starting point (as of 2026-10-23)

Fork / local copy of an existing vanilla **JavaScript Piano**. Behavior is click + keyboard playback of WAV samples, hover hints, and a displayed note name. Stack is HTML, CSS, JS only. No later local feature work is recorded yet.

### 2026-10-23 — vintage concert-hall look
- **What:** Page background is now the parchment sheet-music image. Type switched to Cinzel (title / played note) and Cormorant Garamond (body). Text and key-press glow shifted to warm gold so they sit on the new background.
- **Why:** Match an old, rich music-salon aesthetic instead of the flat dark gray page and unused PT Serif link.
- **Files:** `index.html`, `style.css`, `bg_image.jpg`, `PROJECT.md`
- **How to show it:** Open the local page and check the full-page score texture, title lettering, and gold press highlight.

### 2026-10-23 — readable concert-program type
- **What:** Gold text on parchment was too low-contrast. Header and the played-note now sit on cream program panels with dark ink. Piano case, keys, and the original blue press glow are restored.
- **Why:** Keep the vintage look while making instructions and the title easy to read.
- **Files:** `style.css`, `PROJECT.md`
- **How to show it:** Open the local page — title, controls, and the note name should read as dark lettering on cream cards over the sheet-music background.

### 2026-10-23 — compact piano + hearing side by side
- **What:** Slim header (title, one-line legend, volume/record in one card). Piano and hearing panel sit in a two-column workspace so you can play and watch the spectrogram / cochlea together. Key geometry unchanged. Stacks on narrow screens.
- **Why:** The old vertical stack hid the graphs while playing.
- **Files:** `index.html`, `style.css`, `script.js`, `PROJECT.md`
- **How to show it:** Open on a desktop-width window — piano left, hearing panel right, both on screen.

### 2026-10-23 — hearing panel (spectrogram and cochlea)
- **What:** Panel under the note name with a scrolling spectrogram (`AnalyserNode`), an uncoiled Greenwood-style place map (apex left / base right), and an apical vs basal caption. Replay drives the same visuals. Disclaimer: software model, no sensors.
- **Why:** Show how hearing encodes pitch using the real WAV keys, without hardware and without changing the piano layout.
- **Files:** `index.html`, `style.css`, `script.js`, `README.md`, `PROJECT.md`
- **How to show it:** Play C4 then E5 — marker jumps toward the base; spectrogram lights up; caption switches apical/basal.

### 2026-10-23 — record and replay last sequence
- **What:** Toolbar Record/Stop and Play last sequence. Timing between notes is stored. Replay uses the same play path and is not re-recorded. A new Record run replaces the previous sequence.
- **Why:** Let someone capture a short phrase without changing the piano layout.
- **Files:** `index.html`, `style.css`, `script.js`, `README.md`, `PROJECT.md`
- **How to show it:** Record, play C4–E4–G4, Stop, then Play last sequence.

### 2026-10-23 — octave hints and frequencies
- **What:** Key hints and `data-note` are now C4–E5. Last white key hint is `E5 (;)`. Each key has `data-freq` (Hz). Header legend dropped `ç`.
- **Why:** Two keys were both labeled C; octave names (and frequencies) are needed before a cochlear place map.
- **Files:** `index.html`, `README.md`, `PROJECT.md`
- **How to show it:** Hover the piano — first white key `C4 (a)`, last white key `E5 (;)`. Play both C keys and compare the big note name.

### 2026-10-23 — volume slider
- **What:** Cream toolbar under the header with a 0–100% volume range. First key press builds a Web Audio graph (`MediaElementSource` → `GainNode` → speakers). Arrow keys on the slider change volume only.
- **Why:** Let the player set loudness without touching the piano layout.
- **Files:** `index.html`, `style.css`, `script.js`, `README.md`, `PROJECT.md`
- **How to show it:** Play a note, drag volume to 0 (silence) and back up; confirm the piano keys did not move.

### 2026-10-23 — product shell (Pianoforte)
- **What:** Renamed from JavaScript Piano to **Pianoforte**. Header is a product bar (name, tagline, volume, record/play). Piano and hearing map sit in a two-column workspace; legend lives under the keys. Spectrogram has an **i** dialog that explains FFT axes, harmonics, and that this is a model. Keyboard events are ignored while the dialog is open.
- **Why:** Read as a product, not a tutorial dump; the spectrogram needed an explanation you can also use in interviews.
- **Files:** `index.html`, `style.css`, `script.js`, `README.md`, `PROJECT.md`
- **How to show it:** Open the page — title is Pianoforte. Click **i** next to Spectrogram. Play C4 then E5.

### 2026-10-23 — cool-toned typography and theme
- **What:** Replaced the vintage serif/sepia shell with a cool icy palette. DM Sans headings, Inter body, IBM Plex Mono for notes, Hz, and key maps. Translucent white panels, ivory/charcoal keys, muted blue play highlight. Spectrogram and cochlea canvases retinted to navy + blue (same drawing logic).
- **Why:** Match the new abstract background and read as a contemporary instrument, not an antique salon page.
- **Files:** `index.html`, `style.css`, `script.js`, `README.md`, `PROJECT.md`
- **How to show it:** Open the page — cool panels over the icy background; play a key for the blue glow and navy spectrogram.

### 2026-10-23 — piano keys restored, quieter chrome
- **What:** Keys are white and black again (original case, shadows, press). Dropped the blue play halo, uppercase section labels, and icy fills on buttons so the UI stays cool without looking like a blue dashboard.
- **Why:** The charcoal/ivory keys and blue glow overstated the theme; the instrument should still read as a piano.
- **Files:** `style.css`, `PROJECT.md`
- **How to show it:** Open the page — piano is black-and-white; panels stay light and quiet.

---
