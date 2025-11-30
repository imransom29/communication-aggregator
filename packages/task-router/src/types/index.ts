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

export interface MessageRequest {
  channel: 'email' | 'sms' | 'whatsapp';
  to: string;
  subject?: string;
  body: string;
  metadata?: Record<string, any>;
}

export interface LogEntry {
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  service: string;
  traceId: string;
  timestamp: string;
  metadata?: Record<string, any>;
}
