export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function resolveAudioFormat(mimeType: unknown) {
  const type = typeof mimeType === 'string' ? mimeType.toLowerCase() : 'audio/webm';

  if (type.includes('mp4')) return 'mp4';
  if (type.includes('ogg')) return 'ogg';
  if (type.includes('wav')) return 'wav';
  if (type.includes('mpeg') || type.includes('mp3')) return 'mp3';
  if (type.includes('flac')) return 'flac';
  if (type.includes('m4a')) return 'm4a';

  return 'webm';
}

async function normalizeTranscriptText(apiKey: string, origin: string, text: string) {
  const cleaned = text.trim();
  if (!cleaned) return '';

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': origin,
      'X-Title': 'AISO Transcript Normalizer',
    },
    body: JSON.stringify({
      model: 'google/gemini-3.1-flash-lite-preview',
      temperature: 0,
      messages: [
        {
          role: 'system',
          content:
            'You clean speech-to-text for a Pakistani service booking app. Return only the corrected transcript. Output must be English or Roman Urdu using Latin letters only. Never output Urdu/Arabic script, Devanagari, Cyrillic, Chinese, or any non-Latin script. If the input contains Urdu, Hindi, Punjabi, or mixed Pakistani speech, transliterate it into natural Roman Urdu. Fix obvious ASR mistakes using context like plumber, electrician, AC repair, emergency, location, and urgency. Do not add new details.',
        },
        {
          role: 'user',
          content: cleaned,
        },
      ],
    }),
  });

  const raw = await response.text();
  let data: unknown = {};

  try {
    data = raw ? JSON.parse(raw) : {};
  } catch {
    return cleaned;
  }

  if (!response.ok) return cleaned;

  const completion = data as { choices?: Array<{ message?: { content?: string } }> };
  return completion.choices?.[0]?.message?.content?.trim() || cleaned;
}

export async function POST(req: Request) {
  try {
    const { base64Audio, mimeType } = await req.json();

    if (!base64Audio || typeof base64Audio !== 'string') {
      return Response.json({ error: 'Missing base64Audio payload' }, { status: 400 });
    }

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return Response.json({ error: 'OPENROUTER_API_KEY is not configured' }, { status: 500 });
    }

    let audioBytes: Buffer;
    try {
      audioBytes = Buffer.from(base64Audio, 'base64');
    } catch {
      return Response.json({ error: 'Invalid base64 audio payload' }, { status: 400 });
    }

    if (audioBytes.length === 0) {
      return Response.json({ error: 'Empty audio chunk' }, { status: 400 });
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
        input_audio: {
          data: base64Audio,
          format: resolveAudioFormat(mimeType),
        },
      }),
    });

    const raw = await upstream.text();
    let data: unknown = {};

    try {
      data = raw ? JSON.parse(raw) : {};
    } catch {
      data = { raw };
    }

    if (!upstream.ok) {
      const d = data as { error?: { message?: string } | string; message?: string; raw?: string };
      const msg =
        (typeof d.error === 'object' && typeof d.error.message === 'string' && d.error.message) ||
        (typeof d.error === 'string' && d.error) ||
        d.message ||
        d.raw ||
        'OpenRouter transcription failed';

      if (upstream.status === 400) {
        return Response.json({ text: '', skipped: true, reason: msg });
      }

      return Response.json({ error: msg }, { status: upstream.status });
    }

    const successData = data as { text?: string };
    const normalizedText = await normalizeTranscriptText(
      apiKey,
      origin,
      typeof successData.text === 'string' ? successData.text : ''
    );

    return Response.json({ text: normalizedText });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown transcription error';
    return Response.json({ error: msg }, { status: 500 });
  }
}
