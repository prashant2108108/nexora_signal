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

  const url = `https://graph.instagram.com/${META_API_VERSION}/me/media?fields=id,caption,media_type,media_url,permalink,timestamp,like_count,comments_count`;

  try {
    const response = await fetch(url, {
      headers: { 'Authorization': `Bearer ${INSTAGRAM_ACCESS_TOKEN}` },
    });
    const data = await response.json();
    return data.data || [];
  } catch (error) {
    console.error('[Instagram] getInstagramMedia failed:', error);
    return [];
  }
}

/**
 * Fetches insights for a specific media object.
 */
export async function getMediaInsights(mediaId: string): Promise<any[]> {
  if (!INSTAGRAM_ACCESS_TOKEN) return [];

  const url = `https://graph.instagram.com/${META_API_VERSION}/${mediaId}/insights?metric=engagement,impressions,reach,saved`;

  try {
    const response = await fetch(url, {
      headers: { 'Authorization': `Bearer ${INSTAGRAM_ACCESS_TOKEN}` },
    });
    const data = await response.json();
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
  if (!INSTAGRAM_ACCESS_TOKEN) return [];

  const url = `https://graph.instagram.com/${META_API_VERSION}/${mediaId}/comments?fields=id,text,username,timestamp`;

  try {
    const response = await fetch(url, {
      headers: { 'Authorization': `Bearer ${INSTAGRAM_ACCESS_TOKEN}` },
    });
    const data = await response.json();
    return data.data || [];
  } catch (error) {
    console.error('[Instagram] getInstagramComments failed:', error);
    return [];
  }
}


