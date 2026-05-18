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
 * POST /api/transcribe-chunk
 * Direct, high-performance Speech-to-Text route.
 * Resolves input audio and forwards it under OpenRouter's required input_audio schema.
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

    // Call OpenRouter's required input_audio schema, carrying our context prompt
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
        input_audio: {
          data: base64Audio,
          format: resolveAudioFormat(mimeType),
        },
        prompt: 'This conversation seamlessly switches between English terms and Roman Urdu sentences. ye conversation Roman Urdu aur English me hai. examples: mujhe plumber chahiye very urgently. please mujhe plumber laa do. ye location check karein.',
      }),
    });

    const data = await upstream.json();
    
    if (!upstream.ok) {
      const msg = typeof data?.error?.message === 'string' ? data.error.message : 'OpenRouter transcription failed';
      console.error("[STT API] OpenRouter Error:", msg);
      return Response.json({ error: msg }, { status: upstream.status });
    }

    const transcribedText = typeof data?.text === 'string' ? data.text.trim() : '';
    console.log("[STT API] Transcribed Text:", transcribedText);

    return Response.json({ text: transcribedText });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown transcription error';
    console.error("[STT API] Server Error:", msg);
    return Response.json({ error: msg }, { status: 500 });
  }
}
