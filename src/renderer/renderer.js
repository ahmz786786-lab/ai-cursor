const messagesEl = document.getElementById('messages');
const form = document.getElementById('form');
const input = document.getElementById('input');
const micBtn = document.getElementById('mic');
const providerSel = document.getElementById('provider');
const alwaysListenEl = document.getElementById('alwaysListen');

const history = [];
let isSpeaking = false;       // true while TTS is talking (mute mic)
let isThinking = false;       // true while waiting on AI
let alwaysListen = false;

function addMsg(role, text) {
  const el = document.createElement('div');
  el.className = `msg ${role}`;
  el.textContent = text;
  messagesEl.appendChild(el);
  messagesEl.scrollTop = messagesEl.scrollHeight;
  return el;
}

function speak(text) {
  try {
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 1.05;
    isSpeaking = true;
    u.onend = () => {
      isSpeaking = false;
      if (alwaysListen) startListening();
    };
    u.onerror = () => { isSpeaking = false; };
    speechSynthesis.speak(u);
  } catch { isSpeaking = false; }
}

async function sendPrompt(prompt) {
  if (!prompt.trim()) return;
  isThinking = true;
  stopListening();
  addMsg('user', prompt);
  history.push({ role: 'user', content: prompt });

  const thinking = addMsg('assistant', '…');

  let screenshot = null;
  try {
    screenshot = await window.aiCursor.captureScreen();
  } catch {}

  const res = await window.aiCursor.askAI({
    provider: providerSel.value,
    prompt,
    screenshotDataUrl: screenshot,
    history: history.slice(0, -1),
  });

  isThinking = false;

  if (res.error) {
    thinking.remove();
    addMsg('error', res.error);
    if (alwaysListen) startListening();
    return;
  }

  thinking.textContent = res.text;
  history.push({ role: 'assistant', content: res.text });
  speak(res.text);
}

form.addEventListener('submit', (e) => {
  e.preventDefault();
  const val = input.value;
  input.value = '';
  sendPrompt(val);
});

// --- Voice input via Web Speech API ---
let recognition = null;
let listening = false;
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
if (SR) {
  recognition = new SR();
  recognition.continuous = false;
  recognition.interimResults = false;
  recognition.lang = 'en-US';

  recognition.onstart = () => {
    listening = true;
    micBtn.classList.add('listening');
  };
  recognition.onresult = (e) => {
    const text = e.results[0][0].transcript;
    if (text && text.trim()) sendPrompt(text);
  };
  recognition.onend = () => {
    listening = false;
    micBtn.classList.remove('listening');
    // Auto-restart for hands-free mode
    if (alwaysListen && !isSpeaking && !isThinking) {
      setTimeout(() => startListening(), 250);
    }
  };
  recognition.onerror = (e) => {
    listening = false;
    micBtn.classList.remove('listening');
    if (alwaysListen && e.error !== 'not-allowed' && !isSpeaking && !isThinking) {
      setTimeout(() => startListening(), 800);
    }
  };
}

function startListening() {
  if (!recognition || listening || isSpeaking || isThinking) return;
  try { recognition.start(); } catch {}
}
function stopListening() {
  if (!recognition || !listening) return;
  try { recognition.stop(); } catch {}
}

micBtn.addEventListener('click', () => {
  if (!recognition) {
    addMsg('error', 'Speech recognition not available in this build.');
    return;
  }
  if (listening) stopListening();
  else startListening();
});

alwaysListenEl.addEventListener('change', () => {
  alwaysListen = alwaysListenEl.checked;
  if (alwaysListen) startListening();
  else stopListening();
});

addMsg('assistant', "Hey! I'm your AI cursor. Tell me where you're stuck and I'll guide you.");
