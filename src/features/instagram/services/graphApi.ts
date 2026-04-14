import { MetaReplyResponse } from '../types';

const META_API_VERSION = 'v25.0';
// ✅ REMOVED module-level token — was evaluated once at build time (always undefined on Vercel)

/**
 * Sends a text message to an Instagram user via the Meta Graph API.
 */
export async function sendInstagramMessage(
  recipientId: string,
  text: string
): Promise<MetaReplyResponse | null> {
  const token = process.env.INSTAGRAM_ACCESS_TOKEN; // ✅ read at request time
  if (!token) {
    console.error('[Instagram] INSTAGRAM_ACCESS_TOKEN is not defined');
    return null;
  }

  const url = `https://graph.instagram.com/${META_API_VERSION}/me/messages`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        recipient: { id: recipientId },
        message: { text },
      }),
    });

    const data = await response.json();
    console.log('[Instagram API Response (Message)]', JSON.stringify(data, null, 2));

    if (!response.ok) {
      console.error('[Instagram] API Error:', data);
      return null; // ✅ no longer throws — caller handles null safely
    }

    console.log(`[Instagram] Message sent to ${recipientId}:`, data.message_id || data.mid);
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
  const token = process.env.INSTAGRAM_ACCESS_TOKEN; // ✅ read at request time
  if (!token) {
    console.error('[Instagram] INSTAGRAM_ACCESS_TOKEN is not defined');
    return [];
  }

  let url: string | null = `https://graph.instagram.com/${META_API_VERSION}/me/media?fields=id,caption,media_type,media_url,permalink,timestamp,like_count,comments_count`;
  let allMedia: any[] = [];

  try {
    while (url && allMedia.length < 200) {
      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` },
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
 */
export async function getMediaInsights(mediaId: string, mediaType?: string): Promise<any[]> {
  const token = process.env.INSTAGRAM_ACCESS_TOKEN; // ✅ read at request time
  if (!token) {
    console.error('[Instagram] INSTAGRAM_ACCESS_TOKEN is not defined');
    return [];
  }

  const isReel = mediaType === 'VIDEO' || mediaType === 'REELS';
  const metrics = isReel
    ? 'plays,reach,likes,comments,shares,saved,total_interactions,ig_reels_avg_watch_time'
    : 'reach,saved,total_interactions,likes,comments,shares,profile_visits,follows';

  const url = `https://graph.instagram.com/${META_API_VERSION}/${mediaId}/insights?metric=${metrics}`;

  try {
    const response = await fetch(url, {
      headers: { 'Authorization': `Bearer ${token}` },
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
 * Fetches comments for a specific media object.
 */
export async function getInstagramComments(mediaId: string): Promise<any[]> {
  const token = process.env.INSTAGRAM_ACCESS_TOKEN; // ✅ read at request time
  if (!token) {
    console.error('[Instagram] INSTAGRAM_ACCESS_TOKEN is not defined');
    return [];
  }

  let url: string | null = `https://graph.instagram.com/${META_API_VERSION}/${mediaId}/comments?fields=id,text,timestamp,like_count,from,user,replies{id,text,timestamp,from,user}&limit=100`;
  let allComments: any[] = [];

  try {
    while (url && allComments.length < 500) {
      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` },
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
 * Fetch username from IGSID.
 */
export async function getInstagramUsername(igSid: string): Promise<string> {
  const token = process.env.INSTAGRAM_ACCESS_TOKEN; // ✅ read at request time
  if (!token) {
    console.error('[Instagram] INSTAGRAM_ACCESS_TOKEN is not defined');
    return 'instagram_user';
  }

  // ✅ token moved to Authorization header (not exposed in URL)
  const url = `https://graph.instagram.com/${META_API_VERSION}/${igSid}?fields=name,username`;

  try {
    const response = await fetch(url, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    const data = await response.json();
    return data.username || data.name || 'instagram_user';
  } catch {
    return 'instagram_user';
  }
}

/**
 * Sends a private DM as a reply to a public comment.
 */
export async function sendPrivateReply(commentId: string, message: string): Promise<any> {
  const token = process.env.INSTAGRAM_ACCESS_TOKEN; // ✅ read at request time
  if (!token) {
    console.error('[Instagram] INSTAGRAM_ACCESS_TOKEN is not defined');
    return null;
  }

  const url = `https://graph.instagram.com/${META_API_VERSION}/${commentId}/private_replies?message=${encodeURIComponent(message)}`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
    });
    const data = await response.json();
    console.log(`[Instagram API] Private reply sent to comment ${commentId}:`, data);
    return data;
  } catch (error) {
    console.error('[Instagram] sendPrivateReply failed:', error);
    return null;
  }
}