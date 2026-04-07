const messagesEl = document.getElementById('messages');
const form = document.getElementById('form');
const input = document.getElementById('input');
const micBtn = document.getElementById('mic');
const providerSel = document.getElementById('provider');

const history = [];

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
    speechSynthesis.speak(u);
  } catch {}
}

async function sendPrompt(prompt) {
  if (!prompt.trim()) return;
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

  if (res.error) {
    thinking.remove();
    addMsg('error', res.error);
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
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
if (SR) {
  recognition = new SR();
  recognition.continuous = false;
  recognition.interimResults = false;
  recognition.lang = 'en-US';
  recognition.onresult = (e) => {
    const text = e.results[0][0].transcript;
    input.value = text;
    sendPrompt(text);
    input.value = '';
  };
  recognition.onend = () => micBtn.classList.remove('listening');
  recognition.onerror = () => micBtn.classList.remove('listening');
}

micBtn.addEventListener('click', () => {
  if (!recognition) {
    addMsg('error', 'Speech recognition not available in this build.');
    return;
  }
  if (micBtn.classList.contains('listening')) {
    recognition.stop();
  } else {
    micBtn.classList.add('listening');
    recognition.start();
  }
});

addMsg('assistant', "Hey! I'm your AI cursor. Tell me where you're stuck and I'll guide you.");
