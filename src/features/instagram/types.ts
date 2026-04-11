export interface InstagramWebhookPayload {
  object: string;
  entry: InstagramEntry[];
}

export interface InstagramEntry {
  id: string;
  time: number;
  changes: InstagramChange[];
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

export type Intent = 'GREETING' | 'PRICING' | 'FALLBACK';
