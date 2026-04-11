import { MetaReplyResponse } from '../types';

const META_API_VERSION = 'v19.0';
const PAGE_ACCESS_TOKEN = process.env.META_PAGE_ACCESS_TOKEN;

/**
 * Sends a text message to an Instagram user via the Meta Graph API.
 * @param recipientId The Instagram-scoped User ID (IGSID)
 * @param text The message text to send
 */
export async function sendInstagramMessage(
  recipientId: string,
  text: string
): Promise<MetaReplyResponse | null> {
  if (!PAGE_ACCESS_TOKEN) {
    console.error('META_PAGE_ACCESS_TOKEN is not defined');
    return null;
  }

  const url = `https://graph.facebook.com/${META_API_VERSION}/me/messages?access_token=${PAGE_ACCESS_TOKEN}`;

  const payload = {
    recipient: { id: recipientId },
    message: { text },
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Meta Graph API Error:', data);
      throw new Error(data.error?.message || 'Failed to send message');
    }

    console.log(`[Instagram] Message sent to ${recipientId}: ${data.message_id}`);
    return data as MetaReplyResponse;
  } catch (error) {
    console.error('[Instagram] sendInstagramMessage failed:', error);
    // In a production environment, you might want to implement a retry mechanism here
    return null;
  }
}
