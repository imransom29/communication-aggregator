import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: process.env.PORT || 3002,
  nodeEnv: process.env.NODE_ENV || 'development',
  rabbitmq: {
    url: process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672',
    queues: {
      email: 'email_queue',
      sms: 'sms_queue',
      whatsapp: 'whatsapp_queue'
    },
    prefetchCount: 1
  },
  loggingService: {
    url: process.env.LOGGING_SERVICE_URL || 'http://localhost:3003'
  }
};
