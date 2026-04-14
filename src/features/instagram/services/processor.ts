import { createClient } from '@supabase/supabase-js';
import { InstagramWebhookPayload, Intent, ProcessedMessage } from '../types';
import { 
  sendInstagramMessage, 
  getInstagramMedia, 
  getMediaInsights, 
  getInstagramComments,
  getInstagramUsername,
  sendPrivateReply
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

  await supabaseAdmin.from('instagram_comments').upsert({
    ig_id: id,
    media_id: media_id,
    text: text,
    username: from?.username,
    timestamp: new Date(timestamp * 1000).toISOString(),
  }, { onConflict: 'ig_id' });

  // --- AUTOMATION LOGIC ---
  // If comment contains keywords "send", "info", "link", or "details", send a private DM
  const lowerText = text.toLowerCase();
  const automationKeywords = ['send', 'info', 'link', 'details', 'check', 'price'];
  
  const shouldAutomate = automationKeywords.some(kw => lowerText.includes(kw));

  if (shouldAutomate) {
    console.log(`[Instagram Automation] Triggering private reply for comment ${id}`);
    const automationMessage = `Hey @${from?.username || 'there'}! Thanks for your comment. Here is the link you requested: https://nexora.signal/details/${media_id}`;
    
    await sendPrivateReply(id, automationMessage);
  }
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

  // Process all media items in parallel to stay under Vercel timeout
  await Promise.all(mediaList.map(async (media) => {
    try {
      console.log(`[Instagram Sync] Processing media: ${media.id}`);
      
      // 1. Sync Media Info + Insights + Comments in parallel for this media item
      const [insights, comments] = await Promise.all([
        getMediaInsights(media.id, media.media_type),
        getInstagramComments(media.id)
      ]);

      const mediaUpdate = supabaseAdmin.from('instagram_media').upsert({
        ig_id: media.id,
        caption: media.caption,
        media_type: media.media_type,
        media_url: media.media_url,
        permalink: media.permalink,
        timestamp: media.timestamp,
        like_count: media.like_count,
        comments_count: media.comments_count,
      }, { onConflict: 'ig_id' });

      const insightUpdates = insights.length > 0 ? supabaseAdmin.from('instagram_insights').upsert(
        insights.map(m => ({
          metric_name: m.name,
          value: typeof (m.values ? m.values[0]?.value : m.value) === 'number' ? (m.values ? m.values[0]?.value : m.value) : 0,
          period: m.period || 'lifetime',
          target_id: media.id,
          end_time: m.values ? (m.values[0]?.end_time || null) : null,
        })), 
        { onConflict: 'metric_name,target_id,end_time' }
      ) : Promise.resolve({ error: null });

      const commentUpdates = comments.length > 0 ? supabaseAdmin.from('instagram_comments').upsert(
        comments.map(c => ({
          ig_id: c.id,
          media_id: media.id,
          text: c.text,
          username: c.from?.username || c.user?.username || 'instagram_user',
          timestamp: c.timestamp,
        })),
        { onConflict: 'ig_id' }
      ) : Promise.resolve({ error: null });

      // Build bulk replies list while comments are processing
      const allReplies: any[] = [];
      comments.forEach(c => {
        if (c.replies?.data) {
          c.replies.data.forEach((r: any) => {
            allReplies.push({
              ig_id: r.id,
              comment_id: c.id,
              text: r.text,
              username: r.from?.username || r.user?.username || 'instagram_user',
              timestamp: r.timestamp,
            });
          });
        }
      });

      const replyUpdates = allReplies.length > 0 ? supabaseAdmin.from('instagram_comment_replies').upsert(allReplies, { onConflict: 'ig_id' }) : Promise.resolve({ error: null });

      // Wait for all DB writes for this media item to complete
      const results = await Promise.all([mediaUpdate, insightUpdates, commentUpdates, replyUpdates]);
      const errors = results.map(r => r.error).filter(Boolean);
      if (errors.length > 0) {
        console.error(`[Instagram Sync] DB Errors for media ${media.id}:`, errors);
      } else {
        console.log(`[Instagram Sync] Successfully synced media ${media.id} (${comments.length} comments)`);
      }
    } catch (err) {
      console.error(`[Instagram Sync] Failed processing media ${media.id}:`, err);
    }
  }));

  console.log(`[Instagram Sync] All operations complete.`);
}




/**
 * Processes a single message: deduplication, NLP, storage, and reply.
 */
async function processSingleMessage(msg: ProcessedMessage) {
  console.log(`[Instagram] Processing message from ${msg.senderId}: ${msg.messageText}`);
    console.log('[Debug] ENV check:', {
    hasToken: !!process.env.INSTAGRAM_ACCESS_TOKEN,
    tokenLength: process.env.INSTAGRAM_ACCESS_TOKEN?.length,
    hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
  });

  try {
    // FIX 1: Use supabaseAdmin to bypass RLS
    const { data: existing } = await supabaseAdmin
      .from('instagram_messages')
      .select('id')
      .eq('mid', msg.mid)
      .single();

    if (existing) {
      console.log(`[Instagram] Duplicate: ${msg.mid}. Skipping.`);
      return;
    }

    // Intent detection
    const intent = detectIntent(msg.messageText);
    console.log(`[Instagram] Intent detected: ${intent}`); // ← add this
    
    let replyText = '';
    switch (intent) {
      case 'GREETING':
        replyText = 'Hello! Welcome to Nexora Automation. How can I help you today?';
        break;
      case 'PRICING':
        replyText = 'Our pricing plans start at $19/month. Visit our website for details.';
        break;
      case 'FALLBACK':
      default:
        replyText = "Thank you for your message. Our team will get back to you soon!";
        break;
    }

    // FIX 2: Wrap API call in try/catch
    let apiResponse = null;
    try {
      apiResponse = await sendInstagramMessage(msg.senderId, replyText);
      console.log(`[Instagram] Reply sent successfully:`, apiResponse);
    } catch (apiErr) {
      console.error(`[Instagram] sendInstagramMessage FAILED:`, apiErr); // ← now visible
    }

    // Fetch username
    let senderUsername = 'unknown';
    try {
      senderUsername = await getInstagramUsername(msg.senderId);
    } catch (e) {
      console.error(`[Instagram] getInstagramUsername failed:`, e);
    }

    // FIX 1 continued: Use supabaseAdmin for insert too
    const { error: dbError } = await supabaseAdmin
      .from('instagram_messages')
      .insert({
        sender_id: msg.senderId,
        username: senderUsername,
        message: msg.messageText,
        response: replyText,
        mid: msg.mid,
        metadata: {
          intent,
          timestamp: msg.timestamp,
          api_response: apiResponse,
        },
      });

    if (dbError) {
      console.error('[Instagram] Supabase Insert Error:', dbError);
    } else {
      console.log(`[Instagram] Message stored in DB successfully`);
    }

  } catch (err) {
    console.error(`[Instagram] processSingleMessage fatal error:`, err);
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
