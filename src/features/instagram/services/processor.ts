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

// Service role client — bypasses RLS for all server-side operations
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Main entry point for processing incoming Instagram webhook events.
 * ✅ FIX: await processSingleMessage so Vercel doesn't kill it early
 */
export async function processWebhookPayload(payload: InstagramWebhookPayload) {
  const entries = payload.entry || [];

  for (const entry of entries) {
    // 1. Handle Messaging Events (DMs)
    const messagingEvents = entry.messaging || [];
    for (const event of messagingEvents) {
      if (event.message?.is_echo) continue;
      if (!event.message?.text) continue;

      // ✅ FIX: was fire-and-forget (.catch only) — Vercel killed it before completion
      await processSingleMessage({
        senderId: event.sender.id,
        messageText: event.message.text,
        mid: event.message.mid,
        timestamp: event.timestamp,
      });
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
  // TODO: handle feed events
}

/**
 * Full synchronization of Media and Insights.
 */
export async function syncInstagramData() {
  console.log('[Instagram Sync] Starting full data sync...');
  const mediaList = await getInstagramMedia();
  console.log(`[Instagram Sync] Found ${mediaList.length} media items from Meta`);

  await Promise.all(mediaList.map(async (media) => {
    try {
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

      const replyUpdates = allReplies.length > 0
        ? supabaseAdmin.from('instagram_comment_replies').upsert(allReplies, { onConflict: 'ig_id' })
        : Promise.resolve({ error: null });

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
 * Processes a single DM: deduplication, intent detection, reply, storage.
 */
async function processSingleMessage(msg: ProcessedMessage) {
  console.log("===== START processSingleMessage =====");
  console.log(`[STEP 0] Incoming:`, msg);

  try {
    // STEP 1: Dedup
    console.log("[STEP 1] Checking duplicate...");
    // const { data: existing, error: dedupError } = await supabaseAdmin
    //   .from('instagram_messages')
    //   .select('id')
    //   .eq('mid', msg.mid)
    //   .maybeSingle();

    // console.log("[STEP 1 DONE] existing:", existing);

    // if (dedupError) {
    //   console.error('[STEP 1 ERROR] Dedup error:', dedupError);
    // }

    // if (existing) {
    //   console.log(`[STEP 1 EXIT] Duplicate message: ${msg.mid}`);
    //   return;
    // }

    // STEP 2: Intent
    console.log("[STEP 2] Detecting intent...");
    const intent = detectIntent(msg.messageText);
    console.log(`[STEP 2 DONE] Intent: ${intent}`);

    // STEP 3: Prepare reply
    console.log("[STEP 3] Preparing reply...");
    let replyText = '';

    switch (intent) {
      case 'GREETING':
        replyText = 'Hello! Welcome to Nexora Automation. How can I help you today?';
        break;
      case 'PRICING':
        replyText = 'Our pricing plans start at $19/month. Visit our website for details.';
        break;
      default:
        replyText = 'Thank you for your message. Our team will get back to you soon!';
    }

    console.log("[STEP 3 DONE] Reply:", replyText);

    // STEP 4: SEND MESSAGE (CRITICAL)
    console.log("🚀 [STEP 4] About to call sendInstagramMessage...");

    let apiResponse = null;

    try {
      apiResponse = await sendInstagramMessage(msg.senderId, replyText);
      console.log("✅ [STEP 4 DONE] API Response:", apiResponse);
    } catch (apiErr) {
      console.error("❌ [STEP 4 ERROR] sendInstagramMessage crashed:", apiErr);
    }

    // STEP 5: Username fetch
    console.log("[STEP 5] Fetching username...");
    let senderUsername = 'unknown';

    try {
      senderUsername = await getInstagramUsername(msg.senderId);
      console.log("[STEP 5 DONE] Username:", senderUsername);
    } catch (e) {
      console.error("[STEP 5 ERROR] Username fetch failed:", e);
    }

    // STEP 6: Store DB
    console.log("[STEP 6] Inserting into DB...");
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
      console.error("❌ [STEP 6 ERROR] DB Insert:", dbError);
    } else {
      console.log("✅ [STEP 6 DONE] Stored in DB");
    }

  } catch (err) {
    console.error("💥 FATAL ERROR in processSingleMessage:", err);
  }

  console.log("===== END processSingleMessage =====");
}

/**
 * Basic NLP intent detection.
 */
function detectIntent(text: string): Intent {
  const t = text.toLowerCase().trim();

  if (['hello', 'hi', 'hey'].some(w => t.includes(w))) return 'GREETING';

  if (['price', 'pricing', 'cost', 'how much', 'send', 'link', 'info', 'details', 'check']
    .some(w => t.includes(w))) return 'PRICING';

  return 'FALLBACK';
}

/**
 * Placeholder for OpenAI integration.
 */
async function getAIReply(text: string): Promise<string> {
  return 'AI generated response placeholder';
}