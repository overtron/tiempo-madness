// Vercel Serverless Function for AI Scoring
// This endpoint proxies OpenAI API calls with server-side API key

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Get OpenAI API key from environment variable
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'OpenAI API key not configured on server' });
  }

  try {
    const { sentence, draw } = req.body;

    if (!sentence || !draw) {
      return res.status(400).json({ error: 'Missing sentence or draw data' });
    }

    // Build the prompt for OpenAI
    const prompt = `You are a Spanish grammar judge. Evaluate the player sentence strictly for the given draw.

DRAW:
Subject: ${draw.subject}
Verb (infinitive): ${draw.verb}
Tense: ${draw.tense}
Time cue: ${draw.timeCue}
Special: ${draw.special}

TASK:
1) Score 0–10 on: conjugation accuracy (0–4), tense-time coherence (0–3), special condition (0–2), naturalness (0–1).
2) Provide a one-line corrected version (if needed).
3) Briefly explain the key error(s) in English.

PLAYER SENTENCE:
${sentence}

Provide a JSON response with this exact structure:
{
  "totalScore": <number 0-10>,
  "conjugationScore": <number 0-4>,
  "tenseTimeScore": <number 0-3>,
  "specialConditionScore": <number 0-2>,
  "naturalnessScore": <number 0-1>,
  "correctedVersion": "<corrected sentence or 'Perfect!' if correct>",
  "explanation": "<brief explanation of key errors or strengths>"
}`;

    // Call OpenAI API
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are an expert Spanish language teacher. Always respond with valid JSON only.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 500
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error?.message || `OpenAI API request failed with status ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;

    // Parse the JSON response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Invalid response format from OpenAI');
    }

    const parsed = JSON.parse(jsonMatch[0]);

    // Format the response
    return res.status(200).json({
      totalScore: parsed.totalScore,
      conjugationScore: parsed.conjugationScore,
      tenseTimeScore: parsed.tenseTimeScore,
      specialConditionScore: parsed.specialConditionScore,
      naturalnessScore: parsed.naturalnessScore,
      correctedVersion: parsed.correctedVersion,
      explanation: parsed.explanation
    });

  } catch (error) {
    console.error('OpenAI API error:', error);
    return res.status(500).json({
      error: error.message || 'Failed to score sentence',
      fallback: true // Signal to client to use local scoring
    });
  }
}
