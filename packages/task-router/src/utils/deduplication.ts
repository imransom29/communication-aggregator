import crypto from 'crypto';

// In-memory store for message deduplication
// In production, use Redis or similar
class DeduplicationStore {
  private store: Map<string, number> = new Map();
  private readonly TTL = 3600000; // 1 hour in milliseconds

  constructor() {
    // Clean up expired entries every 5 minutes
    setInterval(() => this.cleanup(), 300000);
  }

  private cleanup() {
    const now = Date.now();
    for (const [key, timestamp] of this.store.entries()) {
      if (now - timestamp > this.TTL) {
        this.store.delete(key);
      }
    }
  }

  has(key: string): boolean {
    const timestamp = this.store.get(key);
    if (!timestamp) return false;

    const now = Date.now();
    if (now - timestamp > this.TTL) {
      this.store.delete(key);
      return false;
    }

    return true;
  }

  add(key: string): void {
    this.store.set(key, Date.now());
  }

  size(): number {
    return this.store.size;
  }
}

const deduplicationStore = new DeduplicationStore();

export const generateMessageHash = (channel: string, to: string, body: string): string => {
  const content = `${channel}:${to}:${body}`;
  return crypto.createHash('sha256').update(content).digest('hex');
};

export const isDuplicate = (hash: string): boolean => {
  return deduplicationStore.has(hash);
};

export const markAsProcessed = (hash: string): void => {
  deduplicationStore.add(hash);
};

export const getDeduplicationStoreSize = (): number => {
  return deduplicationStore.size();
};
