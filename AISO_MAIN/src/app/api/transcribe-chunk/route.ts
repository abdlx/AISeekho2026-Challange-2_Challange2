export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Resolves the raw mimeType string into a format recognized by OpenRouter's STT validation schema.
 */
function resolveAudioFormat(mimeType: string) {
  const type = mimeType.toLowerCase();
  if (type.includes('mp4')) return 'mp4';
  if (type.includes('ogg')) return 'ogg';
  if (type.includes('wav')) return 'wav';
  if (type.includes('mpeg') || type.includes('mp3')) return 'mp3';
  return 'webm'; // Safely default to webm (default for MediaRecorder opus)
}

/**
 * Super-fast transliteration of Urdu Arabic script into clean Roman Urdu using Gemini Flash-Lite.
 */
async function transliterateToRomanUrdu(apiKey: string, origin: string, text: string) {
  const cleaned = text.trim();
  if (!cleaned) return '';

  // Check if the text contains Urdu/Arabic characters. If not, return it directly.
  const hasArabicCharacters = /[\u0600-\u06FF]/.test(cleaned);
  if (!hasArabicCharacters) {
    return cleaned;
  }

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': origin,
        'X-Title': 'AISO Live Transliterater',
      },
      body: JSON.stringify({
        model: 'google/gemini-3.1-flash-lite-preview',
        max_tokens: 150,
        temperature: 0,
        messages: [
          {
            role: 'system',
            content: 'You are a super-fast Urdu-to-Roman-Urdu transliterator for a service booking app. Convert the input Urdu script (Arabic script) into clean, natural Roman Urdu using Latin alphabet characters only. Keep English technical words like plumber, AC, electrician, urgently, emergency, time, location in English. Return ONLY the transliterated Roman Urdu. No explanations, no extra text.',
          },
          {
            role: 'user',
            content: cleaned,
          },
        ],
      }),
    });

    if (!response.ok) {
      console.error("[STT Transliterate] OpenRouter returned error status:", response.status);
      return cleaned;
    }

    const data = await response.json();
    return data?.choices?.[0]?.message?.content?.trim() || cleaned;
  } catch (err) {
    console.error("[STT Transliterate] Exception:", err);
    return cleaned;
  }
}

/**
 * POST /api/transcribe-chunk
 * Direct, high-performance Speech-to-Text route.
 * Forces Urdu transcription using Whisper and then transliterates it instantly to Roman Urdu.
 */
export async function POST(req: Request) {
  try {
    const { base64Audio, mimeType = 'audio/webm' } = await req.json();

    if (!base64Audio || typeof base64Audio !== 'string') {
      return Response.json({ error: 'Missing base64Audio payload' }, { status: 400 });
    }

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return Response.json({ error: 'OPENROUTER_API_KEY is not configured' }, { status: 500 });
    }

    const origin = req.headers.get('origin') || 'http://localhost:3000';

    console.log(`[STT API] Forwarding audio to OpenRouter. Format: ${resolveAudioFormat(mimeType)}. Length: ${base64Audio.length}`);

    // Call OpenRouter's required input_audio schema, forcing Urdu language transcription
    const upstream = await fetch('https://openrouter.ai/api/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': origin,
        'X-Title': 'AISO Live Transcription',
      },
      body: JSON.stringify({
        model: 'openai/whisper-large-v3-turbo',
        language: 'ur', // Strict Urdu transcription
        input_audio: {
          data: base64Audio,
          format: resolveAudioFormat(mimeType),
        },
        prompt: 'یہ گفتگو انگریزی اور اردو میں ہے۔ پلمبر، الیکٹریشن، اے سی سروس۔', // Anchoring prompt to enforce Urdu transcription
      }),
    });

    const data = await upstream.json();
    
    if (!upstream.ok) {
      const msg = typeof data?.error?.message === 'string' ? data.error.message : 'OpenRouter transcription failed';
      console.error("[STT API] OpenRouter Error:", msg);
      return Response.json({ error: msg }, { status: upstream.status });
    }

    const transcribedText = typeof data?.text === 'string' ? data.text.trim() : '';
    console.log("[STT API] Raw Transcribed Text:", transcribedText);

    // Convert raw Arabic script Urdu to Roman Urdu instantly
    const romanUrduText = await transliterateToRomanUrdu(apiKey, origin, transcribedText);
    console.log("[STT API] Transliterated Roman Urdu Text:", romanUrduText);

    return Response.json({ text: romanUrduText });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown transcription error';
    console.error("[STT API] Server Error:", msg);
    return Response.json({ error: msg }, { status: 500 });
  }
}
