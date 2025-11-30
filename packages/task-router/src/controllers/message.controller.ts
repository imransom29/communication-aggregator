import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import { MessageService } from '../services/message.service';
import { createLogger } from '../utils/logger';
import { RequestWithTrace } from '../middleware/traceId.middleware';
import { MessageRequest } from '../types';

export class MessageController {
  private messageService: MessageService;

  constructor() {
    this.messageService = new MessageService();
  }

  public sendMessage = async (req: Request, res: Response) => {
    const traceId = (req as RequestWithTrace).traceId;
    const logger = createLogger(traceId);

    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn('Validation failed', { errors: errors.array() });
      return res.status(400).json({
        success: false,
        errors: errors.array(),
        traceId
      });
    }

    try {
      const messageRequest: MessageRequest = {
        channel: req.body.channel,
        to: req.body.to,
        subject: req.body.subject,
        body: req.body.body,
        metadata: req.body.metadata
      };

      logger.info('Received message request', {
        channel: messageRequest.channel,
        to: messageRequest.to
      });

      const messageId = await this.messageService.processMessage(messageRequest, traceId);

      logger.info('Message processed successfully', { messageId });

      res.status(202).json({
        success: true,
        message: 'Message queued for processing',
        messageId,
        traceId
      });
    } catch (error: any) {
      logger.error('Error processing message', { error: error.message });

      if (error.message === 'Duplicate message detected') {
        return res.status(409).json({
          success: false,
          error: 'Duplicate message detected',
          traceId
        });
      }

      res.status(500).json({
        success: false,
        error: 'Failed to process message',
        traceId
      });
    }
  };

  public healthCheck = async (req: Request, res: Response) => {
    res.status(200).json({
      success: true,
      service: 'task-router',
      status: 'healthy',
      timestamp: new Date().toISOString()
    });
  };
}
