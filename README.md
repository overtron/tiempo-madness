# Tiempo Madness - Judge Mode

A Spanish language learning game that helps practice verb conjugations with smart card draws and local scoring.

## Features

- Smart draws with coherent time cue and tense combinations
- Local scoring with quick rubric checks
- Clipboard integration for ChatGPT judge prompts
- Session history tracking
- Adjustable difficulty levels

## Setup

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm run dev
```

3. Open your browser to the URL shown in the terminal (typically http://localhost:5173)

## How to Use

1. Click "New Draw" to get a new set of cards with compatible tense/time combinations
2. Type your Spanish sentence in the textarea
3. Click "Score" to get immediate feedback on your sentence
4. Use "Copy Judge Prompt" if you want a more detailed ChatGPT evaluation
5. Toggle difficulty to allow tricky specials and irregulars

## Build for Production

```bash
npm run build
```

The built files will be in the `dist` folder.

## Technologies

- React 18
- Vite
- Tailwind CSS
