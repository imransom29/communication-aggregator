export interface Message {
  id: string;
  channel: 'email' | 'sms' | 'whatsapp';
  to: string;
  subject?: string;
  body: string;
  metadata?: Record<string, any>;
  timestamp: string;
  traceId: string;
  retryCount?: number;
}

export interface DeliveryResult {
  success: boolean;
  messageId: string;
  channel: string;
  timestamp: string;
  error?: string;
}

export interface LogEntry {
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  service: string;
  traceId: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

export interface MessageStore {
  id: string;
  channel: string;
  to: string;
  subject?: string;
  body: string;
  status: 'pending' | 'delivered' | 'failed';
  deliveredAt?: string;
  error?: string;
  traceId: string;
}
