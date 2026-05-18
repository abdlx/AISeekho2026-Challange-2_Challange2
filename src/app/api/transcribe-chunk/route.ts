export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const { base64Audio } = await req.json();

    if (!base64Audio || typeof base64Audio !== 'string') {
      return Response.json({ error: 'Missing base64Audio payload' }, { status: 400 });
    }

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return Response.json({ error: 'OPENROUTER_API_KEY is not configured' }, { status: 500 });
    }

    const origin = req.headers.get('origin') || 'http://localhost:3000';

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
        file: base64Audio,
        prompt: 'This conversation can switch between English and Urdu naturally. یہ گفتگو انگریزی اور اردو کے درمیان تبدیل ہو سکتی ہے۔',
      }),
    });

    const data = await upstream.json();
    if (!upstream.ok) {
      const msg = typeof data?.error?.message === 'string' ? data.error.message : 'OpenRouter transcription failed';
      return Response.json({ error: msg }, { status: upstream.status });
    }

    return Response.json({ text: typeof data?.text === 'string' ? data.text : '' });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown transcription error';
    return Response.json({ error: msg }, { status: 500 });
  }
}
