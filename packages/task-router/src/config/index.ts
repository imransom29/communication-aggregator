import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: process.env.PORT || 3001,
  nodeEnv: process.env.NODE_ENV || 'development',
  rabbitmq: {
    url: process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672',
    queues: {
      email: 'email_queue',
      sms: 'sms_queue',
      whatsapp: 'whatsapp_queue'
    },
    retryDelay: 5000,
    maxRetries: 3
  },
  loggingService: {
    url: process.env.LOGGING_SERVICE_URL || 'http://localhost:3003'
  },
  elasticsearch: {
    node: process.env.ELASTICSEARCH_NODE || 'http://localhost:9200'
  }
};
