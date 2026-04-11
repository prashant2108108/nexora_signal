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

