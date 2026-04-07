const Anthropic = require('@anthropic-ai/sdk');

const SYSTEM_PROMPT = `You are AI Cursor — a friendly on-screen helper running on the user's Mac.
You can see screenshots of what the user is looking at. When they're stuck on a page,
guide them step-by-step in plain, concise language. Point to buttons/menus by name.
Keep answers short (1-4 sentences) unless they ask for detail. If a screenshot is
provided, ground your guidance in what is visible.`;

function dataUrlToBase64(dataUrl) {
  if (!dataUrl) return null;
  const match = /^data:(image\/\w+);base64,(.+)$/.exec(dataUrl);
  if (!match) return null;
  return { mediaType: match[1], data: match[2] };
}

async function askClaude({ prompt, screenshotDataUrl, history = [] }) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY not set in .env');

  const client = new Anthropic({ apiKey });

  const userContent = [];
  const img = dataUrlToBase64(screenshotDataUrl);
  if (img) {
    userContent.push({
      type: 'image',
      source: { type: 'base64', media_type: img.mediaType, data: img.data },
    });
  }
  userContent.push({ type: 'text', text: prompt });

  const messages = [
    ...history.map((m) => ({ role: m.role, content: m.content })),
    { role: 'user', content: userContent },
  ];

  const res = await client.messages.create({
    model: 'claude-opus-4-6',
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    messages,
  });

  const text = res.content
    .filter((b) => b.type === 'text')
    .map((b) => b.text)
    .join('\n');
  return { text };
}

module.exports = { askClaude };
