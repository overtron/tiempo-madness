# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Tiempo Madness** is a Spanish language learning game for practicing verb conjugations. Players receive random draws of subject/verb/tense/time-cue/special-condition combinations and must construct grammatically correct sentences. The game features three scoring modes: Cloud AI (OpenAI via Vercel), Local AI (Ollama), and Offline (heuristics).

## Tech Stack

- **React 18** with hooks (useState, useMemo)
- **Vite** for development and build tooling
- **Tailwind CSS** for styling
- **Vercel Serverless Functions** for Cloud AI scoring
- **OpenAI API** (gpt-4o-mini) for Cloud AI mode
- **Ollama** (optional) for Local AI mode
- Single-page app with no routing

## Development Commands

```bash
# Install dependencies
npm install

# Start dev server (typically runs on http://localhost:5173)
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Deploy to Vercel
vercel
```

## Architecture

### Application Structure

The application is contained in a single monolithic component (`TiempoMadnessApp.jsx`) with no separation into smaller components. The entry point is `src/main.jsx`.

**Key files:**
- `TiempoMadnessApp.jsx` - Main application component (single-file architecture)
- `api/score.js` - Vercel serverless function for Cloud AI scoring
- `src/main.jsx` - React app entry point and CSS import
- `src/index.css` - Tailwind directives and global styles
- `.env.example` - Environment variable template (OpenAI API key)

### Core Game Logic

**Draw Generation** (`generateDraw`):
- Randomly selects subject, tense, verb, time cue, and special condition
- Enforces tense/time-cue compatibility through `TIME_CUES` array with `allow` field
- Difficulty level filters available special conditions

**Scoring System** (Three Modes):

1. **Cloud AI** (`scoreWithCloudAI`): Default for deployed app
   - Calls `/api/score` Vercel serverless function
   - Server-side OpenAI API call using **gpt-4o-mini** model
   - API key loaded from `OPENAI_API_KEY` environment variable (server-side only)
   - Cost: ~$0.002 per scoring request
   - Returns structured JSON with breakdown
   - Max score: 10 points
   - Falls back to local scoring on error

2. **Local AI** (`scoreWithOllama`): Uses user's Ollama instance
   - Calls Ollama at configurable URL (default: `http://localhost:11434`)
   - Uses configurable model (default: `llama3`)
   - Same prompt format as Cloud AI
   - Returns structured JSON with breakdown
   - Max score: 10 points
   - Falls back to local scoring on error

3. **Offline** (`scoreSentence`): Heuristic-based pattern matching
   - Time cue integration (1 pt)
   - Tense compliance (2 pts)
   - Special condition fulfillment (2 pts)
   - Subject presence (1 pt)
   - Irregular verb bonus (1 pt)
   - Fluency/length bonus (1 pt)
   - Max score: 9 points
   - No network required, always available

### Data Models

**TIME_CUES**: Array of objects with `text`, `allow` (tense keys), and `weight` (for sampling)

**SPECIALS**: Array of special conditions with `text` (display) and `key` (for detection logic)

**Tense Keys**: `presente`, `preterito`, `futuro`, `ir_a`

### Detection Heuristics

The `detectors` object contains regex-based pattern matching for special conditions. The `tenseCheck` object contains tense-specific verb form detection. These are intentionally lightweight and not full parsers.

## Important Implementation Notes

- **No component decomposition**: The entire app lives in one component function. If refactoring to smaller components, maintain the state flow for draw/sentence/result/history.

- **Scoring fallback**: Both AI modes (Cloud and Ollama) always fall back to local heuristic scoring if they fail. The error is shown but doesn't block the user.

- **History limit**: Session history is capped at 50 entries (see `.slice(0,50)` in `doScore`).

- **No state persistence**: All state (history, scoring mode, difficulty, Ollama settings) is lost on page refresh.

- **Clipboard API**: Uses `navigator.clipboard.writeText()` for the judge prompt copy feature.

- **Vercel deployment**: The `/api/score.js` serverless function requires `OPENAI_API_KEY` environment variable set in Vercel dashboard.

- **Local dev Cloud AI**: Cloud AI mode won't work in local development (`npm run dev`) because the `/api/score` endpoint only exists when deployed to Vercel. Use Ollama or Offline mode for local testing.

## Working with Scoring Logic

When modifying scoring:
- **Offline scoring**: `scoreSentence()` - uses regex detectors (lines 131-179)
- **Cloud AI scoring**: `scoreWithCloudAI()` - calls `/api/score` serverless function
- **Ollama scoring**: `scoreWithOllama()` - calls Ollama API at configurable URL
- **API endpoint**: `/api/score.js` - Vercel serverless function that proxies OpenAI
- All AI scoring functions must return compatible result objects: `{totalScore, breakdown, explanation, correctedVersion}`
- Local scoring returns: `{score, max, notes}`
- Special condition detection switch statement is in `scoreSentence()` lines 147-162

## Deployment

### Vercel (Recommended)
1. Run `vercel` to deploy (or `vercel --prod` for production)
2. Add `OPENAI_API_KEY` environment variable in Vercel dashboard:
   - Go to Project Settings → Environment Variables
   - Add `OPENAI_API_KEY` with your OpenAI API key
   - Enable for "Production" environment
3. **Important**: Redeploy after adding environment variables (`vercel --prod`)
   - Environment variables only take effect on new deployments
4. Vercel automatically detects `/api` folder and creates serverless functions

### Vercel Auto-Detection
Vercel correctly detects these settings for Vite:
- Build Command: `vite build`
- Development Command: `vite --port $PORT`
- Output Directory: `dist`

### Environment Variables
- `OPENAI_API_KEY`: Required for Cloud AI mode (server-side only, never exposed to client)
- Must redeploy after adding/changing environment variables

## Ollama Integration

The app supports Ollama for private, local AI scoring:
- Uses Ollama's `/api/chat` endpoint (not the completions endpoint)
- Default URL: `http://localhost:11434`
- Default model: `llama3`
- **Recommended models for Spanish** (in order of quality):
  1. `llama3` (8B or 70B) - Best for Spanish grammar and structured output
  2. `mistral` (7B) - Good alternative, slightly faster
  3. `gemma2` (9B or 27B) - Works but less consistent with Spanish
- User can configure both URL and model name in the UI
- Ollama must be running locally for this mode to work

## Styling

Uses Tailwind utility classes throughout. No custom CSS beyond Tailwind directives in `src/index.css`.

Common patterns:
- Cards: `bg-white rounded-2xl shadow p-4`
- Buttons: `px-3 py-2 rounded-xl shadow bg-<color>-600 text-white hover:shadow-md`
- Inputs: `border rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-400`

## License

MIT (see LICENSE file)
