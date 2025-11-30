import { Router } from 'express';
import { body } from 'express-validator';
import { MessageController } from '../controllers/message.controller';

const router = Router();
const messageController = new MessageController();

// Validation rules
const messageValidation = [
  body('channel')
    .isIn(['email', 'sms', 'whatsapp'])
    .withMessage('Channel must be one of: email, sms, whatsapp'),
  body('to')
    .isString()
    .notEmpty()
    .withMessage('Recipient (to) is required'),
  body('subject')
    .optional()
    .isString()
    .withMessage('Subject must be a string'),
  body('body')
    .isString()
    .notEmpty()
    .withMessage('Message body is required'),
  body('metadata')
    .optional()
    .isObject()
    .withMessage('Metadata must be an object')
];

// Routes
router.post('/', messageValidation, messageController.sendMessage);
router.get('/health', messageController.healthCheck);

export default router;
