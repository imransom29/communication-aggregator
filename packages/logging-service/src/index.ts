import express from 'express';
import cors from 'cors';
import { config } from './config';
import logRoutes from './routes/log.routes';
import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/logs', logRoutes);

// Root health check
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    service: 'logging-service',
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
});

// Error handling
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Unhandled error', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method
  });

  res.status(500).json({
    success: false,
    error: 'Internal Server Error',
    message: config.nodeEnv === 'development' ? err.message : 'An error occurred'
  });
});

// Start server
const PORT = config.port || 3003;
app.listen(PORT, () => {
  logger.info(`Logging Service running on port ${PORT}`);
  logger.info(`Environment: ${config.nodeEnv}`);
  logger.info(`Elasticsearch: ${config.elasticsearch.node}`);
});

process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  process.exit(0);
});

process.on('unhandledRejection', (reason: Error) => {
  logger.error('Unhandled Rejection', { error: reason.message, stack: reason.stack });
});

export { app };
