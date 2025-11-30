import { logger } from './utils/logger';
import { ConsumerService } from './services/consumer.service';
import { storageService } from './services/storage.service';

const consumerService = new ConsumerService();

const startService = async () => {
  try {
    logger.info('Starting Delivery Service...');

    // Connect to RabbitMQ and start consuming
    await consumerService.connect();

    logger.info('Delivery Service started successfully');
    logger.info('Listening for messages from RabbitMQ queues');

    // Log stats every 30 seconds
    setInterval(() => {
      const stats = storageService.getStats();
      logger.info('Delivery statistics', stats);
    }, 30000);

  } catch (error: any) {
    logger.error('Failed to start Delivery Service', { error: error.message });
    process.exit(1);
  }
};

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  await consumerService.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');
  await consumerService.close();
  process.exit(0);
});

process.on('unhandledRejection', (reason: Error) => {
  logger.error('Unhandled Rejection', { error: reason.message, stack: reason.stack });
});

startService();
