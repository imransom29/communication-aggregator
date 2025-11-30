import { v4 as uuidv4 } from 'uuid';
import { Message, MessageRequest } from '../types';
import { RabbitMQService } from './rabbitmq.service';
import { createLogger } from '../utils/logger';
import { generateMessageHash, isDuplicate, markAsProcessed } from '../utils/deduplication';
import { config } from '../config';

export class MessageService {
  private rabbitmqService: RabbitMQService;

  constructor() {
    this.rabbitmqService = RabbitMQService.getInstance();
  }

  public async processMessage(request: MessageRequest, traceId: string): Promise<string> {
    const logger = createLogger(traceId);
    
    // Generate message hash for deduplication
    const messageHash = generateMessageHash(request.channel, request.to, request.body);
    
    // Check for duplicates
    if (isDuplicate(messageHash)) {
      logger.warn('Duplicate message detected', {
        channel: request.channel,
        to: request.to,
        hash: messageHash
      });
      throw new Error('Duplicate message detected');
    }

    // Create message object
    const messageId = uuidv4();
    const message: Message = {
      id: messageId,
      channel: request.channel,
      to: request.to,
      subject: request.subject,
      body: request.body,
      metadata: request.metadata || {},
      timestamp: new Date().toISOString(),
      traceId,
      retryCount: 0
    };

    logger.info('Processing message', {
      messageId,
      channel: request.channel,
      to: request.to
    });

    // Publish to RabbitMQ with retry logic
    await this.publishWithRetry(message, logger);

    // Mark as processed for deduplication
    markAsProcessed(messageHash);

    logger.info('Message queued successfully', { messageId });

    return messageId;
  }

  private async publishWithRetry(message: Message, logger: any, attempt: number = 1): Promise<void> {
    try {
      const published = await this.rabbitmqService.publishMessage(message);
      
      if (!published) {
        throw new Error('Failed to publish message to queue');
      }
    } catch (error: any) {
      logger.error('Failed to publish message', {
        attempt,
        error: error.message,
        messageId: message.id
      });

      if (attempt < config.rabbitmq.maxRetries) {
        logger.info('Retrying message publication', {
          attempt: attempt + 1,
          messageId: message.id
        });

        await new Promise(resolve => setTimeout(resolve, config.rabbitmq.retryDelay));
        return this.publishWithRetry(message, logger, attempt + 1);
      }

      throw new Error(`Failed to publish message after ${config.rabbitmq.maxRetries} attempts`);
    }
  }
}
