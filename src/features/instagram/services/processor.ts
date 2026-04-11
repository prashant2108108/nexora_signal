import { createClient } from '@supabase/supabase-js';
import { InstagramWebhookPayload, Intent, ProcessedMessage } from '../types';
import { sendInstagramMessage } from './graphApi';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

/**
 * Main entry point for processing incoming Instagram webhook events.
 * Handles parsing, deduplication, and triggering responses.
 */
export async function processWebhookPayload(payload: InstagramWebhookPayload) {
  const entries = payload.entry || [];

  for (const entry of entries) {
    // ✅ Correct: Instagram uses entry.messaging[], not entry.changes[]
    const messagingEvents = entry.messaging || [];

    for (const event of messagingEvents) {
      // ✅ Skip echo messages (bot's own sent messages) — prevents infinite loop
      if (event.message?.is_echo) continue;
      // Skip delivery/read receipts
      if (!event.message?.text) continue;

      processSingleMessage({
        senderId: event.sender.id,
        messageText: event.message.text,
        mid: event.message.mid,
        timestamp: event.timestamp,
      }).catch((err) => {
        console.error('[Instagram] Error processing message:', err);
      });
    }
  }
}


/**
 * Processes a single message: deduplication, NLP, storage, and reply.
 */
async function processSingleMessage(msg: ProcessedMessage) {
  console.log(`[Instagram] Processing message from ${msg.senderId}: ${msg.messageText}`);

  // 1. Deduplication: Check if message ID already exists in Supabase
  const { data: existing } = await supabase
    .from('instagram_messages')
    .select('id')
    .eq('mid', msg.mid)
    .single();

  if (existing) {
    console.log(`[Instagram] Duplicate message detected: ${msg.mid}. Skipping.`);
    return;
  }

  // 2. Intent Detection (Basic NLP)
  const intent = detectIntent(msg.messageText);
  let replyText = '';

  switch (intent) {
    case 'GREETING':
      replyText = 'Hello! Welcome to Nexora Automation. How can I help you today?';
      break;
    case 'PRICING':
      replyText = 'Our pricing plans start at $19/month. You can find more details on our website.';
      break;
    case 'FALLBACK':
    default:
      // PLACEHOLDER: Integrate with OpenAI or another AI service here
      // const aiReply = await getAIReply(msg.messageText);
      replyText = "Thank you for your message. Our team will get back to you soon!";
      break;
  }

  // 3. Store in Supabase
  const { error: dbError } = await supabase.from('instagram_messages').insert({
    sender_id: msg.senderId,
    message: msg.messageText,
    response: replyText,
    mid: msg.mid,
    metadata: {
      intent,
      timestamp: msg.timestamp,
    },
  });

  if (dbError) {
    console.error('[Instagram] Supabase Insert Error:', dbError);
    // Continue anyway to try and send the reply
  }

  // 4. Send Reply via Graph API
  await sendInstagramMessage(msg.senderId, replyText);
}

/**
 * Basic NLP logic to detect user intent from message text.
 */
function detectIntent(text: string): Intent {
  const normalizedText = text.toLowerCase().trim();

  if (
    normalizedText.includes('hello') ||
    normalizedText.includes('hi') ||
    normalizedText.includes('hey')
  ) {
    return 'GREETING';
  }

  if (
    normalizedText.includes('price') ||
    normalizedText.includes('pricing') ||
    normalizedText.includes('cost') ||
    normalizedText.includes('how much')
  ) {
    return 'PRICING';
  }

  return 'FALLBACK';
}

/**
 * Placeholder for OpenAI integration.
 */
async function getAIReply(text: string): Promise<string> {
  // TODO: Add OpenAI API call here
  // const response = await openai.chat.completions.create({...});
  return "AI generated response placeholder";
}
