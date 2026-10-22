## Pianoforte

Cool-toned browser piano. Play C4–E5 with the mouse or keyboard, set volume, record a phrase, and watch a spectrogram plus a cochlear place map of the same WAV samples. The piano key layout is the original instrument; the page around it is the product shell.

How to talk about it (pitch, spectrogram **i** button, architecture): [PROJECT.md](PROJECT.md).

---
![preview](preview.png)

### Run locally

```bash
cd /home/arushi/tech/Piano
python3 -m http.server 8000
```

Open `http://localhost:8000` in a browser. Stop the server with `Ctrl+C`.

If port 8000 is taken:

```bash
python3 -m http.server 8080
```

Then open `http://localhost:8080`.

Optional:

```bash
xdg-open http://localhost:8000
```

### Technologies

- HTML
- CSS
- JavaScript

### Features

Users are able to:

- [x] Play the piano using the mouse (click)
- [x] Play the piano using the keyboard (legend under the keys)
- [x] Hover the piano for hints: octave note names (C4–E5) and keyboard controls
- [x] Set playback volume with a slider
- [x] Record the latest sequence and play it back
- [x] See a spectrogram of the played WAV and a cochlear place-frequency marker
- [x] Open the spectrogram **i** dialog for what the graph is (software model, no sensors)

### Concepts practiced

- DOM manipulation
- DOM traversal
- Event bubbling
- Event delegation
- Mouse, keyboard, and CSS events

---

##### Made with ❤ by @saber.io
