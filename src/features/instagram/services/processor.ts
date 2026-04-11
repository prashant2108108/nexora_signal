import { createClient } from '@supabase/supabase-js';
import { InstagramWebhookPayload, Intent, ProcessedMessage } from '../types';
import { 
  sendInstagramMessage, 
  getInstagramMedia, 
  getMediaInsights, 
  getInstagramComments 
} from './graphApi';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

/**
 * Main entry point for processing incoming Instagram webhook events.
 */
export async function processWebhookPayload(payload: InstagramWebhookPayload) {
  const entries = payload.entry || [];

  for (const entry of entries) {
    // 1. Handle Messaging Events (DMs)
    const messagingEvents = entry.messaging || [];
    for (const event of messagingEvents) {
      if (event.message?.is_echo) continue;
      if (!event.message?.text) continue;

      processSingleMessage({
        senderId: event.sender.id,
        messageText: event.message.text,
        mid: event.message.mid,
        timestamp: event.timestamp,
      }).catch(err => console.error('[Instagram DM Error]', err));
    }

    // 2. Handle Changes (Feed, Comments, etc.)
    const changes = entry.changes || [];
    for (const change of changes) {
      if (change.field === 'comments') {
        await handleIncomingComment(change.value);
      } else if (change.field === 'feed') {
        await handleFeedChange(change.value);
      }
    }
  }
}

/**
 * Handles incoming comments via webhook.
 */
async function handleIncomingComment(value: any) {
  const { id, text, from, timestamp, media_id } = value;
  console.log(`[Instagram] New comment on ${media_id} from ${from?.username}: ${text}`);

  await supabase.from('instagram_comments').upsert({
    ig_id: id,
    media_id: media_id,
    text: text,
    username: from?.username,
    timestamp: new Date(timestamp * 1000).toISOString(),
  });
}

/**
 * Handles feed changes (likes, new posts, etc.)
 */
async function handleFeedChange(value: any) {
  // Logic to handle likes or media updates
  // Usually involves re-fetching the specific media object
}

/**
 * Full synchronization of Media and Insights.
 * Best triggered manually or via a cron job.
 */
export async function syncInstagramData() {
  console.log('[Instagram] Starting full data sync...');
  const mediaList = await getInstagramMedia();

  for (const media of mediaList) {
    // 1. Sync Media Info
    await supabase.from('instagram_media').upsert({
      ig_id: media.id,
      caption: media.caption,
      media_type: media.media_type,
      media_url: media.media_url,
      permalink: media.permalink,
      timestamp: media.timestamp,
      like_count: media.like_count,
      comments_count: media.comments_count,
    });

    // 2. Sync Insights (optional but recommended)
    const insights = await getMediaInsights(media.id);
    for (const metric of insights) {
      for (const value of metric.values) {
        await supabase.from('instagram_insights').upsert({
          metric_name: metric.name,
          value: value.value,
          period: metric.period,
          target_id: media.id,
          end_time: value.end_time,
        });
      }
    }

    // 3. Sync Top Comments (optional)
    const comments = await getInstagramComments(media.id);
    for (const comment of comments) {
      await supabase.from('instagram_comments').upsert({
        ig_id: comment.id,
        media_id: media.id,
        text: comment.text,
        username: comment.username,
        timestamp: comment.timestamp,
      });
    }
  }

  console.log(`[Instagram] Sync complete. Processed ${mediaList.length} items.`);
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

  // 3. Send Reply via Graph API first to get the response confirmation
  const apiResponse = await sendInstagramMessage(msg.senderId, replyText);

  // 4. Store EVERYTHING in Supabase (Single Insert matches RLS policy)
  const { error: dbError } = await supabase.from('instagram_messages').insert({
    sender_id: msg.senderId,
    message: msg.messageText,
    response: replyText,
    mid: msg.mid,
    metadata: {
      intent,
      timestamp: msg.timestamp,
      api_response: apiResponse, // Now stored in the initial insert!
    },
  });

  if (dbError) {
    console.error('[Instagram] Supabase Insert Error:', dbError);
  }
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
