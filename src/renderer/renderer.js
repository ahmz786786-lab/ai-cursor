const bubble = document.getElementById('bubble');
const panel = document.getElementById('panel');
const closeBtn = document.getElementById('closeBtn');
const messagesEl = document.getElementById('messages');
const form = document.getElementById('form');
const input = document.getElementById('input');
const micBtn = document.getElementById('mic');
const providerSel = document.getElementById('provider');

const history = [];
let isSpeaking = false;
let isThinking = false;
let listening = false;
let panelOpen = false;

function addMsg(role, text) {
  const el = document.createElement('div');
  el.className = `msg ${role}`;
  el.textContent = text;
  messagesEl.appendChild(el);
  messagesEl.scrollTop = messagesEl.scrollHeight;
  return el;
}

function setBubbleState() {
  bubble.classList.toggle('listening', listening && !panelOpen);
  bubble.classList.toggle('thinking', isThinking);
}

async function expandPanel() {
  if (panelOpen) return;
  panelOpen = true;
  await window.aiCursor.setExpanded(true);
  bubble.classList.add('hidden');
  panel.classList.remove('hidden');
  input.focus();
}

async function collapsePanel() {
  if (!panelOpen) return;
  panelOpen = false;
  panel.classList.add('hidden');
  bubble.classList.remove('hidden');
  await window.aiCursor.setExpanded(false);
}

function speak(text) {
  try {
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 1.05;
    isSpeaking = true;
    setBubbleState();
    u.onend = () => { isSpeaking = false; setBubbleState(); startListening(); };
    u.onerror = () => { isSpeaking = false; setBubbleState(); };
    speechSynthesis.speak(u);
  } catch { isSpeaking = false; }
}

async function sendPrompt(prompt) {
  if (!prompt.trim()) return;
  if (!panelOpen) await expandPanel();
  isThinking = true;
  setBubbleState();
  stopListening();
  addMsg('user', prompt);
  history.push({ role: 'user', content: prompt });
  const thinking = addMsg('assistant', '…');

  const res = await window.aiCursor.askAI({
    provider: providerSel.value,
    prompt,
    history: history.slice(0, -1),
  });

  isThinking = false;
  setBubbleState();

  if (res.error) {
    thinking.remove();
    addMsg('error', res.error);
    startListening();
    return;
  }
  thinking.textContent = res.text;
  history.push({ role: 'assistant', content: res.text });
  speak(res.text);
}

form.addEventListener('submit', (e) => {
  e.preventDefault();
  const v = input.value;
  input.value = '';
  sendPrompt(v);
});

bubble.addEventListener('click', expandPanel);
closeBtn.addEventListener('click', collapsePanel);

// --- Always-on voice input ---
let recognition = null;
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
if (SR) {
  recognition = new SR();
  recognition.continuous = false;
  recognition.interimResults = false;
  recognition.lang = 'en-US';

  recognition.onstart = () => { listening = true; micBtn.classList.add('listening'); setBubbleState(); };
  recognition.onresult = (e) => {
    const text = e.results[0][0].transcript;
    if (text && text.trim()) sendPrompt(text);
  };
  recognition.onend = () => {
    listening = false;
    micBtn.classList.remove('listening');
    setBubbleState();
    if (!isSpeaking && !isThinking) setTimeout(startListening, 250);
  };
  recognition.onerror = (e) => {
    listening = false;
    micBtn.classList.remove('listening');
    setBubbleState();
    if (e.error !== 'not-allowed' && !isSpeaking && !isThinking) setTimeout(startListening, 800);
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
  if (listening) stopListening(); else startListening();
});

// Kick off listening immediately so the user can just talk
window.addEventListener('load', () => setTimeout(startListening, 500));
