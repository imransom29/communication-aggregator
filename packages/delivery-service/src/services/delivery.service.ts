import { Message, DeliveryResult } from '../types';
import { createLogger } from '../utils/logger';
import { storageService } from './storage.service';

export class DeliveryService {
  // Simulate email delivery
  private async deliverEmail(message: Message): Promise<DeliveryResult> {
    const logger = createLogger(message.traceId);
    
    logger.info('Delivering email', {
      messageId: message.id,
      to: message.to,
      subject: message.subject
    });

    // Simulate processing time
    await this.simulateDelay(500, 1500);

    // Simulate 95% success rate
    const success = Math.random() > 0.05;

    if (success) {
      logger.info('Email delivered successfully', {
        messageId: message.id,
        to: message.to
      });

      return {
        success: true,
        messageId: message.id,
        channel: 'email',
        timestamp: new Date().toISOString()
      };
    } else {
      const error = 'SMTP server temporarily unavailable';
      logger.error('Email delivery failed', {
        messageId: message.id,
        error
      });

      return {
        success: false,
        messageId: message.id,
        channel: 'email',
        timestamp: new Date().toISOString(),
        error
      };
    }
  }

  // Simulate SMS delivery
  private async deliverSMS(message: Message): Promise<DeliveryResult> {
    const logger = createLogger(message.traceId);
    
    logger.info('Delivering SMS', {
      messageId: message.id,
      to: message.to
    });

    // Simulate processing time
    await this.simulateDelay(300, 1000);

    // Simulate 98% success rate
    const success = Math.random() > 0.02;

    if (success) {
      logger.info('SMS delivered successfully', {
        messageId: message.id,
        to: message.to
      });

      return {
        success: true,
        messageId: message.id,
        channel: 'sms',
        timestamp: new Date().toISOString()
      };
    } else {
      const error = 'Invalid phone number or network error';
      logger.error('SMS delivery failed', {
        messageId: message.id,
        error
      });

      return {
        success: false,
        messageId: message.id,
        channel: 'sms',
        timestamp: new Date().toISOString(),
        error
      };
    }
  }

  // Simulate WhatsApp delivery
  private async deliverWhatsApp(message: Message): Promise<DeliveryResult> {
    const logger = createLogger(message.traceId);
    
    logger.info('Delivering WhatsApp message', {
      messageId: message.id,
      to: message.to
    });

    // Simulate processing time
    await this.simulateDelay(400, 1200);

    // Simulate 97% success rate
    const success = Math.random() > 0.03;

    if (success) {
      logger.info('WhatsApp message delivered successfully', {
        messageId: message.id,
        to: message.to
      });

      return {
        success: true,
        messageId: message.id,
        channel: 'whatsapp',
        timestamp: new Date().toISOString()
      };
    } else {
      const error = 'User not registered on WhatsApp or service unavailable';
      logger.error('WhatsApp delivery failed', {
        messageId: message.id,
        error
      });

      return {
        success: false,
        messageId: message.id,
        channel: 'whatsapp',
        timestamp: new Date().toISOString(),
        error
      };
    }
  }

  // Main delivery method
  public async deliver(message: Message): Promise<DeliveryResult> {
    const logger = createLogger(message.traceId);

    // Save message to storage
    storageService.saveMessage({
      id: message.id,
      channel: message.channel,
      to: message.to,
      subject: message.subject,
      body: message.body,
      status: 'pending',
      traceId: message.traceId
    });

    logger.info('Processing message delivery', {
      messageId: message.id,
      channel: message.channel
    });

    let result: DeliveryResult;

    try {
      switch (message.channel) {
        case 'email':
          result = await this.deliverEmail(message);
          break;
        case 'sms':
          result = await this.deliverSMS(message);
          break;
        case 'whatsapp':
          result = await this.deliverWhatsApp(message);
          break;
        default:
          throw new Error(`Unsupported channel: ${message.channel}`);
      }

      // Update storage
      storageService.updateMessageStatus(
        message.id,
        result.success ? 'delivered' : 'failed',
        result.error
      );

      return result;
    } catch (error: any) {
      logger.error('Delivery error', {
        messageId: message.id,
        error: error.message
      });

      storageService.updateMessageStatus(message.id, 'failed', error.message);

      return {
        success: false,
        messageId: message.id,
        channel: message.channel,
        timestamp: new Date().toISOString(),
        error: error.message
      };
    }
  }

  private simulateDelay(min: number, max: number): Promise<void> {
    const delay = Math.floor(Math.random() * (max - min + 1)) + min;
    return new Promise(resolve => setTimeout(resolve, delay));
  }
}
