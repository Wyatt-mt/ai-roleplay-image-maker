const express = require('express');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const DEFAULT_ROLEPLAY_MODEL = process.env.OPENROUTER_MODEL || 'anthropic/claude-3.5-sonnet';
const DEFAULT_IMAGE_MODEL = process.env.HUGGINGFACE_IMAGE_MODEL || 'black-forest-labs/FLUX.1-dev';

app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

function makeDemoRoleplayReply(persona, userText) {
  const cleanText = (userText || '').trim();
  const introMap = {
    'Fantasy Mage': 'The arcane air crackles around us as I answer with a sharp, vivid edge:',
    'Cyber Detective': 'My visor flares and I dig into the details with cold precision:',
    'Cozy Friend': 'I lean in with a warm, comforting smile and say:',
    'Space Captain': 'The engines hum in the background as I deliver a confident, cinematic reply:',
    'Grok-style Analyst': 'I cut through the noise and answer with direct, sharp insight:'
  };

  const intro = introMap[persona] || 'I respond with detail, energy, and personality:';
  const summary = cleanText
    ? `You said, "${cleanText}" — and that sharpens the scene instantly.`
    : 'The silence is heavy, and the room is waiting.';

  return `${intro} "${summary} I stay in character, keep the tension alive, and push the story forward with vivid detail, instinct, and momentum."`;
}

function generateDemoImageData(prompt, style) {
  const safePrompt = (prompt || 'dreamscape').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const safeStyle = (style || 'cinematic').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
      <defs>
        <linearGradient id="bg" x1="0%" x2="100%" y1="0%" y2="100%">
          <stop offset="0%" stop-color="#020817"/>
          <stop offset="35%" stop-color="#111827"/>
          <stop offset="70%" stop-color="#312e81"/>
          <stop offset="100%" stop-color="#7c3aed"/>
        </linearGradient>
        <radialGradient id="glow" cx="50%" cy="30%" r="50%">
          <stop offset="0%" stop-color="#fef3c7" stop-opacity="0.9"/>
          <stop offset="100%" stop-color="#fef3c7" stop-opacity="0"/>
        </radialGradient>
      </defs>
      <rect width="1024" height="1024" fill="url(#bg)"/>
      <circle cx="512" cy="290" r="260" fill="url(#glow)"/>
      <circle cx="250" cy="260" r="90" fill="#38bdf8" opacity="0.14"/>
      <circle cx="780" cy="360" r="130" fill="#f472b6" opacity="0.12"/>
      <path d="M160 760C270 620 390 560 500 560C630 560 710 650 860 820L160 760Z" fill="#fff" opacity="0.12"/>
      <path d="M250 760C340 650 420 580 510 580C610 580 700 660 780 760" stroke="#e2e8f0" stroke-width="8" fill="none" opacity="0.66"/>
      <text x="512" y="915" text-anchor="middle" fill="#f8fafc" font-size="46" font-family="Arial, sans-serif" font-weight="700">${safePrompt}</text>
      <text x="512" y="965" text-anchor="middle" fill="#cbd5e1" font-size="26" font-family="Arial, sans-serif" opacity="0.8">Style: ${safeStyle}</text>
    </svg>
  `;

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

async function callOpenRouter(messages, persona) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  const model = process.env.OPENROUTER_MODEL || DEFAULT_ROLEPLAY_MODEL;

  if (!apiKey) {
    return null;
  }

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
      'HTTP-Referer': 'http://localhost:3000',
      'X-Title': 'AI Roleplay Image Maker'
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: 'system',
          content: `You are a premium conversational AI with a confident, smart, and engaging personality. Persona: ${persona}. Keep responses vivid, coherent, quick, and high-quality. Use storytelling, sharp thinking, and natural charisma. Be direct when needed, but never robotic.`
        },
        ...messages
      ],
      temperature: 0.9,
      top_p: 0.95
    })
  });

  if (!response.ok) {
    throw new Error(`OpenRouter API error: ${response.status}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || 'I am ready to continue the scene.';
}

async function callHuggingFaceImage(prompt, style) {
  const apiKey = process.env.HUGGINGFACE_API_KEY;
  const model = process.env.HUGGINGFACE_IMAGE_MODEL || DEFAULT_IMAGE_MODEL;

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
        num_inference_steps: 30,
        guidance_scale: 8.0
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
    hasHuggingFaceKey: Boolean(process.env.HUGGINGFACE_API_KEY),
    recommendedModel: DEFAULT_ROLEPLAY_MODEL,
    recommendedImageModel: DEFAULT_IMAGE_MODEL
  });
});

app.post('/api/chat', async (req, res) => {
  try {
    const { messages = [], persona = 'Grok-style Analyst' } = req.body || {};
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
    const { prompt = 'A futuristic neon city at sunrise', style = 'cinematic' } = req.body || {};

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

