# Tiempo Madness - Judge Mode

A Spanish language learning game that helps practice verb conjugations with smart card draws and multiple AI scoring modes.

## Features

- Smart draws with coherent time cue and tense combinations
- **Three scoring modes:**
  - ☁️ **Cloud AI**: Server-side OpenAI scoring (default, no API key needed from users)
  - 🏠 **Local AI**: Your own Ollama instance (private, free, offline)
  - 📊 **Offline**: Fast heuristic pattern-matching
- Clipboard integration for ChatGPT judge prompts
- Session history tracking
- Adjustable difficulty levels

## Local Development Setup

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm run dev
```

3. Open your browser to the URL shown in the terminal (typically http://localhost:5173)

Note: In local development, Cloud AI mode won't work without deployment. Use Ollama or Offline mode instead.

## How to Use

1. **Select scoring mode** from the dropdown (Cloud AI, Local AI, or Offline)
2. Click "New Draw" to get a new set of cards with compatible tense/time combinations
3. Type your Spanish sentence in the textarea
4. Click "Score" to get immediate feedback
5. Use "Copy Judge Prompt" if you want a more detailed ChatGPT evaluation
6. Toggle difficulty to allow tricky specials and irregulars

## Scoring Modes

### ☁️ Cloud AI (Recommended for deployed app)
- Uses OpenAI GPT-4o-mini via server-side API
- No API key required from users
- Most accurate feedback
- Requires deployment to Vercel (see below)

### 🏠 Local AI (Ollama)
- Uses Ollama running on your local machine
- Completely private and free
- Works offline
- Requires Ollama installation (see below)

### 📊 Offline
- Fast pattern-matching heuristics
- Works anywhere, no setup needed
- Good for quick practice

## Setting Up Ollama (Optional)

To use Local AI mode:

1. **Install Ollama** from [ollama.ai](https://ollama.ai)

2. **Pull a Spanish-capable model**:
```bash
ollama pull llama3      # Recommended - best for Spanish
# or
ollama pull mistral     # Good alternative
# or
ollama pull gemma2      # Decent but less accurate for Spanish
```

**Model Recommendations for Spanish:**
- **llama3** (8B or 70B) - Best overall for Spanish grammar and structured output
- **mistral** (7B) - Good alternative, slightly faster
- **gemma2** (9B or 27B) - Works but less consistent with Spanish

3. **Run Ollama** (it starts automatically on most systems, or run):
```bash
ollama serve
```

4. **In the app**, select "🏠 Local AI (Ollama)" mode and optionally configure:
   - Ollama URL (default: `http://localhost:11434`)
   - Model name (default: `llama3`)

## Deploying to Vercel

Deploy your own instance with Cloud AI scoring:

1. **Install Vercel CLI**:
```bash
npm install -g vercel
```

2. **Deploy**:
```bash
vercel
```

3. **Add your OpenAI API key** in Vercel dashboard:
   - Go to your project settings
   - Navigate to "Environment Variables"
   - Add `OPENAI_API_KEY` with your OpenAI API key
   - Get a key from: https://platform.openai.com/api-keys

4. **Redeploy** (or it will auto-deploy on next git push)

### Cost Estimate
- **Vercel hosting**: Free tier (100GB bandwidth/month)
- **OpenAI API**: ~$0.002 per scoring request (gpt-4o-mini)
- For typical personal use: ~$1-5/month total

## Build for Production

```bash
npm run build
```

The built files will be in the `dist` folder.

## Technologies

- React 18
- Vite
- Tailwind CSS
- Vercel Serverless Functions
- OpenAI API (gpt-4o-mini)
- Ollama (optional)
