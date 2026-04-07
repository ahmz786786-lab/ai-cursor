const { GoogleGenerativeAI } = require('@google/generative-ai');

const SYSTEM_PROMPT = `You are AI Cursor — a friendly on-screen helper running on the user's Mac.
You can see screenshots of what the user is looking at. When they're stuck on a page,
guide them step-by-step in plain, concise language. Point to buttons/menus by name.
Keep answers short (1-4 sentences) unless they ask for detail.`;

function dataUrlToInlineData(dataUrl) {
  if (!dataUrl) return null;
  const match = /^data:(image\/\w+);base64,(.+)$/.exec(dataUrl);
  if (!match) return null;
  return { inlineData: { mimeType: match[1], data: match[2] } };
}

async function askGemini({ prompt, screenshotDataUrl, history = [] }) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY not set in .env');

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.0-flash',
    systemInstruction: SYSTEM_PROMPT,
  });

  const parts = [];
  const img = dataUrlToInlineData(screenshotDataUrl);
  if (img) parts.push(img);
  parts.push({ text: prompt });

  const chat = model.startChat({
    history: history.map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: typeof m.content === 'string' ? m.content : '' }],
    })),
  });

  const result = await chat.sendMessage(parts);
  return { text: result.response.text() };
}

module.exports = { askGemini };
