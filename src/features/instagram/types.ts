export interface InstagramWebhookPayload {
  object: string;
  entry: InstagramEntry[];
}

export interface InstagramEntry {
  id: string;
  time: number;
  changes?: InstagramChange[];
  messaging?: InstagramMessagingEvent[];
}

export interface InstagramMessagingEvent {
  sender: { id: string };
  recipient: { id: string };
  timestamp: number;
  message?: {
    mid: string;
    text?: string;
    is_echo?: boolean;
    attachments?: any[];
  };
}

export interface InstagramChange {
  field: string;
  value: InstagramValue;
}

export interface InstagramValue {
  messages?: InstagramMessage[];
}


export interface InstagramMessage {
  from: {
    id: string;
    username?: string;
  };
  id: string;
  text: string;
  timestamp: number;
}

export interface ProcessedMessage {
  senderId: string;
  messageText: string;
  mid: string;
  timestamp: number;
}

export interface MetaReplyResponse {
  recipient_id: string;
  message_id: string;
}

export interface InstagramMedia {
  id: string;
  caption?: string;
  media_type: 'IMAGE' | 'VIDEO' | 'CAROUSEL_ALBUM';
  media_url: string;
  permalink: string;
  timestamp: string;
  like_count: number;
  comments_count: number;
  ig_id: string; // The ID from Instagram
}

export interface InstagramComment {
  id: string;
  text: string;
  username: string;
  timestamp: string;
  media_id: string;
}

export interface InstagramInsight {
  name: string;
  period: string;
  values: { value: number; end_time: string }[];
  title?: string;
  description?: string;
}

export type Intent = 'GREETING' | 'PRICING' | 'FALLBACK';

