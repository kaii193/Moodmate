# Pond: talking characters (React + Vite)

27 SVG characters you can talk to by voice. Each one changes its expression to match the emotion of the reply, moves its mouth with the audio, and follows the mouse pointer with its eyes.

## Features

- **Conversation**: press the mic to speak, or type. The server calls Claude, gets back `{reply, emotion}`, and the character reads the reply aloud with the browser's voice.
- **Expressions**: `neutral`, `happy`, `sad`, `surprised`, `thinking`, `listening`. Expressions are interpolated (lerp) frame by frame, so changes are smooth.
- **Lip-sync**: with the browser's voice, the mouth follows word boundaries. When mirroring the mic or playing an audio file, the mouth opens with the real volume (RMS).
- **Gaze**: the pupils follow the mouse pointer and return to center when the pointer leaves the window.
- **Paragraph demo**: reads a multi-sentence sample paragraph, one emotion per sentence, to show the character changing expression while it speaks.
- **Characters**: Frog, Fox, Vietnamese iced coffee, the 12 Vietnamese zodiac animals, and the 12 Western zodiac signs.

## Getting started

Requires Node 20.6 or later. After copying `.env.example` to `.env`, set `ANTHROPIC_API_KEY` in `.env`.

```bash
npm install
cp .env.example .env
npm run dev
```

Open http://localhost:5192. The `dev` script runs Vite (the UI) and the Node server on port 8787 (the Claude calls) side by side. Without an API key the app still runs: the character reads back what you type, and expressions, lip-sync, gaze, and the Demo button all keep working.

## Vietnamese voices

Voices come from the browser and the operating system, so they vary by machine:

- **Microsoft Edge** ships natural Vietnamese voices (Hoài My, Nam Minh). Edge is recommended.
- **Chrome on Windows** can only use voices installed in Windows: Settings → Time & language → Speech → Add voices.

When the browser has no voice for the selected language, the app shows a notice and falls back to the default voice. Speech recognition (the mic) requires Chrome or Edge.

## Project structure

```
server/index.js               Node server: holds the API key, calls Claude, returns {reply, emotion}
src/App.jsx                   Character list and conversation state idle → listening → thinking → speaking
src/frog/                     Frog: Frog.jsx (face and animation loop) and expressions.js (parameters per expression)
src/fox/, src/coffee/         Fox and coffee cup, same layout as the frog
src/zodiac/<animal>/          The 12 Vietnamese zodiac animals
src/horoscope/<sign>/         The 12 Western zodiac signs
src/hooks/useSpeech.js        Browser speech synthesis, sentence sequences, and speech recognition
src/hooks/useAudioLevel.js    RMS lip-sync from the mic, a file, or a realtime API MediaStream
src/hooks/usePointerGaze.js   Gaze direction from the pointer position
src/lib/brain.js              Calls /api/chat
src/lib/demoReply.js          Sample paragraph for the Demo button (Vietnamese and English)
```

## Adding a character

Each character is a component that takes two props:

```jsx
<Face emotion="happy" getSpeakLevel={(t) => 0.6} />
```

- `emotion`: one of the keys in `expressions.js`.
- `getSpeakLevel(t)`: returns how open the mouth is, 0..1, at time `t` in seconds.

Create a new folder with `<Name>.jsx` and `expressions.js` following `src/fox/`, then add one entry to `CHARACTERS` in `src/App.jsx`. SVG ids are global to the page, so give each character its own prefix (for example `foxEyeClipL`).

## Upgrading to a realtime API

Replace the "browser listens → /api/chat → browser speaks" flow with a WebRTC connection to a realtime API. The server issues an ephemeral token instead of calling the model directly. When the AI's audio arrives:

```js
pc.ontrack = (e) => audio.attachStream(e.streams[0]);
```

The characters need no changes: they only take `emotion` and a function that returns the mouth opening, 0..1.
