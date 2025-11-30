import amqp, { Channel, Connection } from 'amqplib';
import { config } from '../config';
import { logger } from '../utils/logger';
import { Message } from '../types';

export class RabbitMQService {
  private static instance: RabbitMQService;
  private connection: Connection | null = null;
  private channel: Channel | null = null;
  private isConnecting = false;

  private constructor() {}

  public static getInstance(): RabbitMQService {
    if (!RabbitMQService.instance) {
      RabbitMQService.instance = new RabbitMQService();
    }
    return RabbitMQService.instance;
  }

  public async connect(): Promise<void> {
    if (this.channel || this.isConnecting) {
      return;
    }

    this.isConnecting = true;

    try {
      logger.info('Connecting to RabbitMQ...', { url: config.rabbitmq.url });
      
      this.connection = await amqp.connect(config.rabbitmq.url);
      this.channel = await this.connection.createChannel();

      // Assert all queues
      await this.channel.assertQueue(config.rabbitmq.queues.email, { durable: true });
      await this.channel.assertQueue(config.rabbitmq.queues.sms, { durable: true });
      await this.channel.assertQueue(config.rabbitmq.queues.whatsapp, { durable: true });

      logger.info('Connected to RabbitMQ successfully');

      // Handle connection errors
      this.connection.on('error', (err) => {
        logger.error('RabbitMQ connection error', { error: err.message });
        this.reconnect();
      });

      this.connection.on('close', () => {
        logger.warn('RabbitMQ connection closed. Reconnecting...');
        this.reconnect();
      });

      this.isConnecting = false;
    } catch (error: any) {
      this.isConnecting = false;
      logger.error('Failed to connect to RabbitMQ', { error: error.message });
      
      // Retry connection after delay
      setTimeout(() => this.reconnect(), 5000);
      throw error;
    }
  }

  private async reconnect(): Promise<void> {
    this.channel = null;
    this.connection = null;
    this.isConnecting = false;
    
    await new Promise(resolve => setTimeout(resolve, 5000));
    await this.connect();
  }

  public async publishMessage(message: Message): Promise<boolean> {
    if (!this.channel) {
      throw new Error('RabbitMQ channel not initialized');
    }

    const queue = this.getQueueName(message.channel);
    if (!queue) {
      throw new Error(`Unsupported channel: ${message.channel}`);
    }

    try {
      const sent = this.channel.sendToQueue(
        queue,
        Buffer.from(JSON.stringify(message)),
        {
          persistent: true,
          contentType: 'application/json'
        }
      );

      if (sent) {
        logger.info('Message published to queue', {
          messageId: message.id,
          queue,
          traceId: message.traceId
        });
      }

      return sent;
    } catch (error: any) {
      logger.error('Failed to publish message', {
        error: error.message,
        messageId: message.id,
        traceId: message.traceId
      });
      throw error;
    }
  }

  private getQueueName(channel: string): string | undefined {
    const queueMap: Record<string, string> = {
      email: config.rabbitmq.queues.email,
      sms: config.rabbitmq.queues.sms,
      whatsapp: config.rabbitmq.queues.whatsapp
    };
    return queueMap[channel];
  }

  public async close(): Promise<void> {
    try {
      await this.channel?.close();
      await this.connection?.close();
      logger.info('RabbitMQ connection closed');
    } catch (error: any) {
      logger.error('Error closing RabbitMQ connection', { error: error.message });
    }
  }

  public isConnected(): boolean {
    return this.channel !== null;
  }
}
