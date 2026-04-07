# AI Cursor

A floating AI helper for your Mac. It sits on top of whatever you're doing, watches your screen when you ask for help, listens to your voice, and guides you through pages when you're stuck — speaking back to you in plain words.

Powered by **Claude** (Anthropic) or **Gemini** (Google) — switch anytime from the dropdown.

## Features

- 🪟 Frameless, translucent floating overlay (always on top)
- 🎤 Voice input (Web Speech API) + spoken replies
- 👀 Screen-aware: captures the current screen so the AI can see what you see
- 🧠 Pluggable providers: Claude (`claude-opus-4-6`) or Gemini (`gemini-2.0-flash`)
- ⌨️ Global shortcut: `⌘⇧Space` to show/hide

## Setup

```bash
npm install
cp .env.example .env
# edit .env and add at least one API key
npm start
```

On first run, macOS will ask for **Microphone** and **Screen Recording** permissions (System Settings → Privacy & Security). Grant both.

## How it works

```
┌─────────────────────────┐
│   Electron overlay      │  renderer (HTML/CSS/JS)
│  mic → text → prompt    │
└──────────┬──────────────┘
           │ IPC
┌──────────▼──────────────┐
│   main process          │
│  desktopCapturer ──► 📸 │
│  providers/claude.js    │──► Anthropic API
│  providers/gemini.js    │──► Google Generative AI
└─────────────────────────┘
```

The assistant receives your question **plus** a screenshot of the primary display, so it can ground its guidance in what's actually on screen ("Click the blue *Continue* button near the top-right").

## Project layout

```
src/
  main.js              # Electron main process, window + IPC
  preload.js           # safe bridge to renderer
  providers/
    claude.js          # Anthropic SDK integration
    gemini.js          # Google Generative AI integration
  renderer/
    index.html
    styles.css
    renderer.js        # chat UI + voice
```

## Roadmap

- [ ] Continuous "listening mode" (wake word)
- [ ] Click-through overlay when idle
- [ ] Highlight the UI element the AI is pointing to
- [ ] Local transcription (Whisper) as a fallback
- [ ] Packaged `.dmg` build
