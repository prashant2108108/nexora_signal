import { createClient } from '@supabase/supabase-js';
import { InstagramWebhookPayload, Intent, ProcessedMessage } from '../types';
import { 
  sendInstagramMessage, 
  getInstagramMedia, 
  getMediaInsights, 
  getInstagramComments 
} from './graphApi';

// Anon client for public webhook operations
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Service role client bypasses RLS — used for server-side sync writes
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
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
  }, { onConflict: 'ig_id' });
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
  console.log('[Instagram Sync] Starting full data sync...');
  const mediaList = await getInstagramMedia();
  console.log(`[Instagram Sync] Found ${mediaList.length} media items from Meta`);

  for (const media of mediaList) {
    console.log(`[Instagram Sync] Processing media: ${media.id}`);
    
    // 1. Sync Media Info
    const { error: mediaErr } = await supabaseAdmin.from('instagram_media').upsert({
      ig_id: media.id,
      caption: media.caption,
      media_type: media.media_type,
      media_url: media.media_url,
      permalink: media.permalink,
      timestamp: media.timestamp,
      like_count: media.like_count,
      comments_count: media.comments_count,
    }, { onConflict: 'ig_id' });

    if (mediaErr) {
      console.error(`[Instagram Sync] Error upserting media ${media.id}:`, mediaErr);
      continue;
    }

    // 2. Sync Insights (type-aware)
    const insights = await getMediaInsights(media.id, media.media_type);
    console.log(`[Instagram Sync] Fetched insights for ${media.id}: ${insights.length} metrics`);
    for (const metric of insights) {
      const value = metric.values ? metric.values[0]?.value : metric.value;
      const { error: insErr } = await supabaseAdmin.from('instagram_insights').upsert({
        metric_name: metric.name,
        value: typeof value === 'number' ? value : 0,
        period: metric.period || 'lifetime',
        target_id: media.id,
        end_time: metric.values ? (metric.values[0]?.end_time || null) : null,
      }, { onConflict: 'metric_name,target_id,end_time' });
      if (insErr) console.error(`[Instagram Sync] Error upserting insight ${metric.name}:`, insErr);
    }


    // 3. Sync Comments + Replies
    const comments = await getInstagramComments(media.id);
    console.log(`[Instagram Sync] Fetched comments for ${media.id}: ${comments.length} items`);
    for (const comment of comments) {
      const { error: comErr } = await supabaseAdmin.from('instagram_comments').upsert({
        ig_id: comment.id,
        media_id: media.id,
        text: comment.text,
        username: comment.from?.username || 'instagram_user',
        like_count: comment.like_count || 0,
        timestamp: comment.timestamp,
      }, { onConflict: 'ig_id' });
      if (comErr) console.error(`[Instagram Sync] Error upserting comment ${comment.id}:`, comErr);

      // Sync replies nested under each comment
      const replies = comment.replies?.data || [];
      for (const reply of replies) {
        const { error: repErr } = await supabaseAdmin.from('instagram_comment_replies').upsert({
          ig_id: reply.id,
          comment_id: comment.id,
          text: reply.text,
          username: reply.from?.username || 'instagram_user',
          timestamp: reply.timestamp,
        }, { onConflict: 'ig_id' });
        if (repErr) console.error(`[Instagram Sync] Error upserting reply ${reply.id}:`, repErr);
      }
    }

  }

  console.log(`[Instagram Sync] All operations complete.`);
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
