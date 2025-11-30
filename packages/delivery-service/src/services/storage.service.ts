import { MessageStore } from '../types';

// In-memory storage for delivered messages
// In production, this would be a database
class StorageService {
  private messages: Map<string, MessageStore> = new Map();

  public saveMessage(message: MessageStore): void {
    this.messages.set(message.id, message);
  }

  public getMessage(id: string): MessageStore | undefined {
    return this.messages.get(id);
  }

  public getAllMessages(): MessageStore[] {
    return Array.from(this.messages.values());
  }

  public getMessagesByChannel(channel: string): MessageStore[] {
    return Array.from(this.messages.values()).filter(m => m.channel === channel);
  }

  public getMessagesByStatus(status: 'pending' | 'delivered' | 'failed'): MessageStore[] {
    return Array.from(this.messages.values()).filter(m => m.status === status);
  }

  public updateMessageStatus(
    id: string,
    status: 'pending' | 'delivered' | 'failed',
    error?: string
  ): void {
    const message = this.messages.get(id);
    if (message) {
      message.status = status;
      if (status === 'delivered') {
        message.deliveredAt = new Date().toISOString();
      }
      if (error) {
        message.error = error;
      }
      this.messages.set(id, message);
    }
  }

  public getStats() {
    const all = this.getAllMessages();
    return {
      total: all.length,
      delivered: all.filter(m => m.status === 'delivered').length,
      failed: all.filter(m => m.status === 'failed').length,
      pending: all.filter(m => m.status === 'pending').length,
      byChannel: {
        email: all.filter(m => m.channel === 'email').length,
        sms: all.filter(m => m.channel === 'sms').length,
        whatsapp: all.filter(m => m.channel === 'whatsapp').length
      }
    };
  }
}

export const storageService = new StorageService();
