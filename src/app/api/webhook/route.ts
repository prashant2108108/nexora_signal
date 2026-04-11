import { NextRequest, NextResponse } from 'next/server';
import { processWebhookPayload } from '@/features/instagram/services/processor';

const VERIFY_TOKEN = process.env.META_VERIFY_TOKEN;

/**
 * GET - Webhook Verification
 * This endpoint is called by Meta when you first configure the webhook.
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  if (mode && token) {
    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      console.log('[Instagram Webhook] Verification successful');
      return new Response(challenge, { status: 200 });
    } else {
      console.warn('[Instagram Webhook] Verification failed: Token mismatch');
      return new Response('Forbidden', { status: 403 });
    }
  }

  return new Response('Bad Request', { status: 400 });
}

/**
 * POST - Incoming Messages
 * This endpoint is called by Meta for every message event.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Basic Logging for debugging (avoid logging sensitive content in production)
    console.log('[Instagram Webhook] Received event:', JSON.stringify(body, null, 2));

    // 1. Respond FAST to Meta (within 5s) to avoid retries/timeouts
    // We don't await the processing logic so we can respond immediately.
    // In Vercel, the function might still continue executing for a short time.
    processWebhookPayload(body).catch((err) => {
      console.error('[Instagram Webhook] Async processing failed:', err);
    });

    return NextResponse.json({ status: 'received' }, { status: 200 });
  } catch (error) {
    console.error('[Instagram Webhook] POST error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// Optional: Rate limiting placeholder logic
// You can use a library like @upstash/ratelimit for actual production use on Vercel
function applyRateLimiting(senderId: string) {
  // Logic to prevent spam
  return true;
}
