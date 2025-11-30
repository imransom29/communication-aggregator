import express from 'express';
import cors from 'cors';
import { config } from './config';
import { logger } from './utils/logger';
import messageRoutes from './routes/message.routes';
import { errorHandler } from './middleware/errorHandler.middleware';
import { traceIdMiddleware } from './middleware/traceId.middleware';
import { RabbitMQService } from './services/rabbitmq.service';

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(traceIdMiddleware);

// Routes
app.use('/api/messages', messageRoutes);

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    service: 'task-router',
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
});

// Error handling
app.use(errorHandler);

// Initialize RabbitMQ connection
const rabbitmqService = RabbitMQService.getInstance();

const startServer = async () => {
  try {
    // Connect to RabbitMQ
    await rabbitmqService.connect();
    logger.info('RabbitMQ connection established');

    // Start server
    const PORT = config.port || 3001;
    app.listen(PORT, () => {
      logger.info(`Task Router Service running on port ${PORT}`);
      logger.info(`Environment: ${config.nodeEnv}`);
    });
  } catch (error: any) {
    logger.error('Failed to start server', { error: error.message });
    process.exit(1);
  }
};

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  await rabbitmqService.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');
  await rabbitmqService.close();
  process.exit(0);
});

process.on('unhandledRejection', (reason: Error) => {
  logger.error('Unhandled Rejection', { error: reason.message, stack: reason.stack });
});

startServer();

export { app };
