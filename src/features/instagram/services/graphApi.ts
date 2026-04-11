import { MetaReplyResponse } from '../types';

const META_API_VERSION = 'v25.0';
const INSTAGRAM_ACCESS_TOKEN = process.env.INSTAGRAM_ACCESS_TOKEN;

/**
 * Sends a text message to an Instagram user via the Meta Graph API.
 * @param recipientId The Instagram-scoped User ID (IGSID)
 * @param text The message text to send
 */
export async function sendInstagramMessage(
  recipientId: string,
  text: string
): Promise<MetaReplyResponse | null> {
  if (!INSTAGRAM_ACCESS_TOKEN) {
    console.error('INSTAGRAM_ACCESS_TOKEN is not defined');
    return null;
  }

  const url = `https://graph.instagram.com/${META_API_VERSION}/me/messages`;

  const payload = {
    recipient: { id: recipientId },
    message: { text },
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${INSTAGRAM_ACCESS_TOKEN}`, // ✅ secure
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    console.log('[Instagram API Response (Message)]', JSON.stringify(data, null, 2));

    if (!response.ok) {
      console.error('Instagram API Error:', data);
      throw new Error(data.error?.message || 'Failed to send message');
    }

    console.log(`[Instagram] Message sent to ${recipientId}: ${data.message_id || data.mid}`);
    return data as MetaReplyResponse;
  } catch (error) {
    console.error('[Instagram] sendInstagramMessage failed:', error);
    return null;
  }
}

/**
 * Fetches a list of media objects (Posts and Reels) for the authenticated account.
 */
export async function getInstagramMedia(): Promise<any[]> {
  if (!INSTAGRAM_ACCESS_TOKEN) return [];

  let url = `https://graph.instagram.com/${META_API_VERSION}/me/media?fields=id,caption,media_type,media_url,permalink,timestamp,like_count,comments_count`;

  let allMedia: any[] = [];
  try {
    while (url && allMedia.length < 200) { // Fetch up to 200 items for safety
      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${INSTAGRAM_ACCESS_TOKEN}` },
      });
      const data = await response.json();
      
      if (data.data) {
        allMedia = allMedia.concat(data.data);
      }
      
      url = data.paging?.next || null;
    }
    console.log(`[Instagram API Response (Media)] Fetched ${allMedia.length} total media items`);
    return allMedia;
  } catch (error) {
    console.error('[Instagram] getInstagramMedia failed:', error);
    return allMedia;
  }
}


/**
 * Fetches all available insights for a specific media object.
 * Metric sets differ by media type (IMAGE vs REELS vs VIDEO).
 */
export async function getMediaInsights(mediaId: string, mediaType?: string): Promise<any[]> {
  if (!INSTAGRAM_ACCESS_TOKEN) return [];

  // Reels have different metric names
  const isReel = mediaType === 'VIDEO' || mediaType === 'REELS';

  const metrics = isReel
    ? 'plays,reach,likes,comments,shares,saved,total_interactions,ig_reels_avg_watch_time'
    : 'reach,saved,total_interactions,likes,comments,shares,profile_visits,follows';

  const url = `https://graph.instagram.com/${META_API_VERSION}/${mediaId}/insights?metric=${metrics}`;

  try {
    const response = await fetch(url, {
      headers: { 'Authorization': `Bearer ${INSTAGRAM_ACCESS_TOKEN}` },
    });
    const data = await response.json();
    if (data.error) {
      console.error(`[Instagram] Insights error for ${mediaId}:`, data.error);
      return [];
    }
    console.log('[Instagram API Response (Insights)]', JSON.stringify(data, null, 2));
    return data.data || [];
  } catch (error) {
    console.error('[Instagram] getMediaInsights failed:', error);
    return [];
  }
}

/**
 * Fetches comments for a specific media object (includes like count and reply count).
 * Handles pagination to fetch all comments up to a safety limit.
 */
export async function getInstagramComments(mediaId: string): Promise<any[]> {
  if (!INSTAGRAM_ACCESS_TOKEN) return [];

  let url = `https://graph.instagram.com/${META_API_VERSION}/${mediaId}/comments?fields=id,text,timestamp,like_count,from,user,replies{id,text,timestamp,from,user}&limit=100`;
  let allComments: any[] = [];

  try {
    while (url && allComments.length < 500) {  // safety limit
      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${INSTAGRAM_ACCESS_TOKEN}` },
      });
      const data = await response.json();
      
      if (data.data) {
        allComments = allComments.concat(data.data);
      }
      
      url = data.paging?.next || null;
    }
    
    console.log(`[Instagram API Response (Comments)] Fetched ${allComments.length} total comments for ${mediaId}`);
    return allComments;
  } catch (error) {
    console.error('[Instagram] getInstagramComments failed:', error);
    return allComments;
  }
}

/**
 * Fetch username from IGSID
 */
export async function getInstagramUsername(igSid: string): Promise<string> {
  const url = `https://graph.instagram.com/${META_API_VERSION}/${igSid}?fields=name,username&access_token=${INSTAGRAM_ACCESS_TOKEN}`;
  
  try {
    const response = await fetch(url);
    const data = await response.json();
    return data.username || data.name || 'instagram_user';
  } catch {
    return 'instagram_user';
  }
}

/**
 * Sends a private DM as a reply to a public comment.
 * Requires the 'instagram_manage_comments' permission.
 */
export async function sendPrivateReply(commentId: string, message: string): Promise<any> {
  if (!INSTAGRAM_ACCESS_TOKEN) return null;

  const url = `https://graph.instagram.com/${META_API_VERSION}/${commentId}/private_replies?message=${encodeURIComponent(message)}`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${INSTAGRAM_ACCESS_TOKEN}` },
    });
    const data = await response.json();
    console.log(`[Instagram API] Private reply sent to comment ${commentId}:`, data);
    return data;
  } catch (error) {
    console.error('[Instagram] sendPrivateReply failed:', error);
    return null;
  }
}


