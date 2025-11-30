import amqp, { Channel, Connection, ConsumeMessage } from 'amqplib';
import { config } from '../config';
import { logger, createLogger } from '../utils/logger';
import { Message } from '../types';
import { DeliveryService } from './delivery.service';

export class ConsumerService {
  private connection: Connection | null = null;
  private channel: Channel | null = null;
  private deliveryService: DeliveryService;
  private isConnecting = false;

  constructor() {
    this.deliveryService = new DeliveryService();
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

      // Set prefetch count
      await this.channel.prefetch(config.rabbitmq.prefetchCount);

      // Assert all queues
      await this.channel.assertQueue(config.rabbitmq.queues.email, { durable: true });
      await this.channel.assertQueue(config.rabbitmq.queues.sms, { durable: true });
      await this.channel.assertQueue(config.rabbitmq.queues.whatsapp, { durable: true });

      logger.info('Connected to RabbitMQ successfully');

      // Start consuming from all queues
      await this.startConsuming();

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

  private async startConsuming(): Promise<void> {
    if (!this.channel) {
      throw new Error('Channel not initialized');
    }

    // Consume email queue
    await this.channel.consume(
      config.rabbitmq.queues.email,
      (msg) => this.handleMessage(msg, 'email'),
      { noAck: false }
    );

    // Consume SMS queue
    await this.channel.consume(
      config.rabbitmq.queues.sms,
      (msg) => this.handleMessage(msg, 'sms'),
      { noAck: false }
    );

    // Consume WhatsApp queue
    await this.channel.consume(
      config.rabbitmq.queues.whatsapp,
      (msg) => this.handleMessage(msg, 'whatsapp'),
      { noAck: false }
    );

    logger.info('Started consuming from all queues');
  }

  private async handleMessage(msg: ConsumeMessage | null, channel: string): Promise<void> {
    if (!msg || !this.channel) {
      return;
    }

    try {
      const message: Message = JSON.parse(msg.content.toString());
      const msgLogger = createLogger(message.traceId);

      msgLogger.info('Received message from queue', {
        messageId: message.id,
        channel,
        queue: channel + '_queue'
      });

      // Deliver the message
      const result = await this.deliveryService.deliver(message);

      if (result.success) {
        // Acknowledge the message
        this.channel.ack(msg);
        msgLogger.info('Message acknowledged', {
          messageId: message.id
        });
      } else {
        // Reject and requeue if delivery failed (with limit)
        const retryCount = message.retryCount || 0;
        if (retryCount < 3) {
          msgLogger.warn('Message delivery failed, requeueing', {
            messageId: message.id,
            retryCount: retryCount + 1
          });
          
          // Update retry count
          message.retryCount = retryCount + 1;
          
          // Requeue with delay (using dead letter exchange in production)
          setTimeout(() => {
            if (this.channel) {
              this.channel.nack(msg, false, true);
            }
          }, 5000);
        } else {
          msgLogger.error('Message delivery failed after max retries', {
            messageId: message.id,
            retryCount
          });
          // Acknowledge to remove from queue (move to DLQ in production)
          this.channel.ack(msg);
        }
      }
    } catch (error: any) {
      logger.error('Error processing message', {
        error: error.message,
        channel
      });
      
      // Reject the message
      if (this.channel) {
        this.channel.nack(msg, false, false);
      }
    }
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
