# AI Roleplay + Image Creator

A Grok-style AI roleplay and image generation app.

## Run locally

```bash
npm install
npm start
```

Open http://localhost:3000

## Deploy to Render

1. Sign up at https://render.com
2. Click New + → Blueprints or Web Service
3. Connect this GitHub repo
4. Render will read the included `render.yaml`
5. Add any API keys in the Render dashboard if you want real AI responses

Required environment values:

```env
OPENROUTER_API_KEY=
OPENROUTER_MODEL=anthropic/claude-3.5-sonnet
HUGGINGFACE_API_KEY=
HUGGINGFACE_IMAGE_MODEL=black-forest-labs/FLUX.1-dev
```

Without keys, the app works in demo mode.

## Best real AI model choices

- x-ai/grok-beta
- anthropic/claude-3.5-sonnet
- openai/gpt-4o-mini

