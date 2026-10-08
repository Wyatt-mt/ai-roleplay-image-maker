const express = require('express');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

function makeDemoRoleplayReply(persona, userText) {
  const cleanText = (userText || '').trim();
  const intro = persona === 'Fantasy Mage'
    ? 'The runes in the air flicker as I lean closer and whisper:'
    : persona === 'Cyber Detective'
      ? 'My visor brightens as I scan the scene and answer:'
      : persona === 'Cozy Friend'
        ? 'I smile and respond with warm energy:'
        : 'I answer with a vivid, immersive tone:';

  const summary = cleanText ? `You said, "${cleanText}" — and that changes the mood instantly.` : 'Your silence is heavy with possibility.';

  return `${intro} "${summary} I lean in, keep the energy alive, and continue the scene with detail, curiosity, and personality. We are in a story together, and I am here to make it unforgettable."`;
}

function generateDemoImageData(prompt, style) {
  const safePrompt = (prompt || 'dreamscape').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const safeStyle = (style || 'cinematic').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
      <defs>
        <linearGradient id="bg" x1="0%" x2="100%" y1="0%" y2="100%">
          <stop offset="0%" stop-color="#0f172a"/>
          <stop offset="50%" stop-color="#1d4ed8"/>
          <stop offset="100%" stop-color="#7c3aed"/>
        </linearGradient>
        <radialGradient id="glow" cx="50%" cy="35%" r="50%">
          <stop offset="0%" stop-color="#fdf2f8" stop-opacity="0.9"/>
          <stop offset="100%" stop-color="#fdf2f8" stop-opacity="0"/>
        </radialGradient>
      </defs>
      <rect width="1024" height="1024" fill="url(#bg)"/>
      <circle cx="512" cy="360" r="260" fill="url(#glow)"/>
      <path d="M240 780C330 630 420 560 500 560C620 560 730 660 790 820L240 780Z" fill="#f8fafc" opacity="0.16"/>
      <path d="M280 760C360 640 440 585 520 585C620 585 690 660 760 770" stroke="#cbd5e1" stroke-width="10" fill="none" opacity="0.66"/>
      <circle cx="325" cy="335" r="90" fill="#facc15" opacity="0.32"/>
      <circle cx="748" cy="315" r="120" fill="#f472b6" opacity="0.2"/>
      <text x="512" y="915" text-anchor="middle" fill="#f8fafc" font-size="52" font-family="Arial, sans-serif" font-weight="700">${safePrompt}</text>
      <text x="512" y="970" text-anchor="middle" fill="#e2e8f0" font-size="28" font-family="Arial, sans-serif" opacity="0.85">Style: ${safeStyle}</text>
    </svg>
  `;

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

async function callOpenRouter(messages, persona) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  const model = process.env.OPENROUTER_MODEL || 'openai/gpt-4o-mini';

  if (!apiKey) {
    return null;
  }

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      'HTTP-Referer': 'http://localhost:3000',
      'X-Title': 'AI Roleplay Image Maker'
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: 'system',
          content: `You are a vivid, engaging roleplay partner. Persona: ${persona}. Keep the chat immersive, dynamic, and expressive.`
        },
        ...messages
      ]
    })
  });

  if (!response.ok) {
    throw new Error(`OpenRouter API error: ${response.status}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || 'I am here and ready to continue the story.';
}

async function callHuggingFaceImage(prompt, style) {
  const apiKey = process.env.HUGGINGFACE_API_KEY;
  const model = process.env.HUGGINGFACE_IMAGE_MODEL || 'black-forest-labs/FLUX.1-dev';

  if (!apiKey) {
    return null;
  }

  const response = await fetch(`https://api-inference.huggingface.co/models/${model}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      inputs: `${prompt} in ${style} style`,
      parameters: {
        num_inference_steps: 20,
        guidance_scale: 7.5
      }
    })
  });

  if (!response.ok) {
    throw new Error(`Hugging Face image API error: ${response.status}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  return `data:image/png;base64,${buffer.toString('base64')}`;
}

app.get('/api/config', (_req, res) => {
  res.json({
    hasOpenRouterKey: Boolean(process.env.OPENROUTER_API_KEY),
    hasHuggingFaceKey: Boolean(process.env.HUGGINGFACE_API_KEY)
  });
});

app.post('/api/chat', async (req, res) => {
  try {
    const { messages = [], persona = 'Fantasy Mage' } = req.body || {};
    const lastUserMessage = [...messages].reverse().find((m) => m.role === 'user');

    let reply;

    try {
      reply = await callOpenRouter(messages, persona);
    } catch (error) {
      reply = makeDemoRoleplayReply(persona, lastUserMessage?.content || '');
    }

    if (!reply) {
      reply = makeDemoRoleplayReply(persona, lastUserMessage?.content || '');
    }

    res.json({ reply });
  } catch (error) {
    res.status(500).json({ error: 'Chat generation failed.' });
  }
});

app.post('/api/image', async (req, res) => {
  try {
    const { prompt = 'A futuristic city at sunrise', style = 'cinematic' } = req.body || {};

    let imageData;

    try {
      imageData = await callHuggingFaceImage(prompt, style);
    } catch (error) {
      imageData = generateDemoImageData(prompt, style);
    }

    if (!imageData) {
      imageData = generateDemoImageData(prompt, style);
    }

    res.json({ imageData });
  } catch (error) {
    res.status(500).json({ error: 'Image generation failed.' });
  }
});

app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`AI Roleplay and Image Maker running on http://localhost:${PORT}`);
});
