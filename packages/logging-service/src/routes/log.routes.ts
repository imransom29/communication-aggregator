import { Router } from 'express';
import { body } from 'express-validator';
import { LogController } from '../controllers/log.controller';

const router = Router();
const logController = new LogController();

// Validation rules
const logValidation = [
  body('level')
    .isIn(['info', 'warn', 'error', 'debug'])
    .withMessage('Level must be one of: info, warn, error, debug'),
  body('message')
    .isString()
    .notEmpty()
    .withMessage('Message is required'),
  body('service')
    .isString()
    .notEmpty()
    .withMessage('Service name is required'),
  body('traceId')
    .isString()
    .notEmpty()
    .withMessage('Trace ID is required'),
  body('timestamp')
    .isString()
    .notEmpty()
    .withMessage('Timestamp is required'),
  body('metadata')
    .optional()
    .isObject()
    .withMessage('Metadata must be an object')
];

// Routes
router.post('/', logValidation, logController.createLog);
router.get('/search', logController.searchLogs);
router.get('/trace/:traceId', logController.getLogsByTraceId);
router.get('/stats', logController.getStats);
router.get('/health', logController.healthCheck);

export default router;
