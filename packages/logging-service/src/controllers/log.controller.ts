import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import { ElasticsearchService } from '../services/elasticsearch.service';
import { LogEntry, LogQuery } from '../types';

export class LogController {
  private elasticsearchService: ElasticsearchService;

  constructor() {
    this.elasticsearchService = new ElasticsearchService();
  }

  public createLog = async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    try {
      const logEntry: LogEntry = req.body;
      await this.elasticsearchService.indexLog(logEntry);

      res.status(201).json({
        success: true,
        message: 'Log indexed successfully'
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: 'Failed to index log',
        message: error.message
      });
    }
  };

  public searchLogs = async (req: Request, res: Response) => {
    try {
      const query: LogQuery = {
        service: req.query.service as string,
        level: req.query.level as string,
        traceId: req.query.traceId as string,
        startTime: req.query.startTime as string,
        endTime: req.query.endTime as string,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 100
      };

      const result = await this.elasticsearchService.searchLogs(query);

      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: 'Failed to search logs',
        message: error.message
      });
    }
  };

  public getLogsByTraceId = async (req: Request, res: Response) => {
    try {
      const { traceId } = req.params;
      const logs = await this.elasticsearchService.getLogsByTraceId(traceId);

      res.status(200).json({
        success: true,
        traceId,
        count: logs.length,
        logs
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: 'Failed to get logs by trace ID',
        message: error.message
      });
    }
  };

  public getStats = async (req: Request, res: Response) => {
    try {
      const stats = await this.elasticsearchService.getStats();

      res.status(200).json({
        success: true,
        data: stats
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: 'Failed to get stats',
        message: error.message
      });
    }
  };

  public healthCheck = async (req: Request, res: Response) => {
    try {
      const isHealthy = await this.elasticsearchService.healthCheck();

      res.status(isHealthy ? 200 : 503).json({
        success: isHealthy,
        service: 'logging-service',
        elasticsearch: isHealthy ? 'connected' : 'disconnected',
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      res.status(503).json({
        success: false,
        service: 'logging-service',
        elasticsearch: 'error',
        error: error.message
      });
    }
  };
}
