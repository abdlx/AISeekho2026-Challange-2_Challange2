import { createAdminClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get('sessionId');
  const bookingId = searchParams.get('bookingId');

  if (!sessionId && !bookingId) {
    return Response.json({ error: 'Missing sessionId or bookingId parameter' }, { status: 400 });
  }

  const adminClient = createAdminClient();
  let targetSessionId = sessionId;

  if (!targetSessionId && bookingId) {
    // Find the session ID by searching for the trace where the booking ID was generated
    const { data: traces, error: searchError } = await adminClient
      .from('agent_traces')
      .select('session_id, payload')
      .eq('tool_name', 'book_provider');

    if (searchError) {
      return Response.json({ error: searchError.message }, { status: 500 });
    }

    const matchedTrace = traces?.find(t => {
      const payload = t.payload as any;
      if (!payload) return false;

      // Extract from standard step toolResults structure
      if (Array.isArray(payload.toolResults)) {
        return payload.toolResults.some((tr: any) => 
          tr.toolName === 'book_provider' && 
          tr.result && 
          (String(tr.result.bookingId) === bookingId || 
           String(tr.result.bookingId).toLowerCase() === bookingId.toLowerCase())
        );
      }
      
      // Fallback: check general string match inside payload
      return JSON.stringify(payload).includes(bookingId);
    });

    if (matchedTrace) {
      targetSessionId = matchedTrace.session_id;
    } else {
      // General fallback: query all traces in book_provider or transaction and check string inclusion
      const generalMatch = traces?.find(t => {
        const payloadStr = JSON.stringify(t.payload);
        return payloadStr.includes(bookingId);
      });
      if (generalMatch) {
        targetSessionId = generalMatch.session_id;
      }
    }
  }

  if (!targetSessionId) {
    return Response.json({ traces: [] });
  }

  const { data, error } = await adminClient
    .from('agent_traces')
    .select('*')
    .eq('session_id', targetSessionId)
    .order('created_at', { ascending: true });

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ traces: data });
}
