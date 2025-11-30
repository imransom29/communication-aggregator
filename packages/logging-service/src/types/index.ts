export interface LogEntry {
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  service: string;
  traceId: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

export interface LogQuery {
  service?: string;
  level?: string;
  traceId?: string;
  startTime?: string;
  endTime?: string;
  limit?: number;
}

export interface LogSearchResult {
  total: number;
  logs: LogEntry[];
}
