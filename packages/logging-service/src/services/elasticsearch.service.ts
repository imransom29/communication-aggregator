import { Client } from '@elastic/elasticsearch';
import { config } from '../config';
import { LogEntry, LogQuery, LogSearchResult } from '../types';
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

export class ElasticsearchService {
  private client: Client;
  private indexName: string;

  constructor() {
    this.client = new Client({
      node: config.elasticsearch.node
    });
    this.indexName = config.elasticsearch.index;
    this.initializeIndex();
  }

  private async initializeIndex(): Promise<void> {
    try {
      const indexExists = await this.client.indices.exists({
        index: this.indexName
      });

      if (!indexExists) {
        await this.client.indices.create({
          index: this.indexName,
          body: {
            mappings: {
              properties: {
                level: { type: 'keyword' },
                message: { type: 'text' },
                service: { type: 'keyword' },
                traceId: { type: 'keyword' },
                timestamp: { type: 'date' },
                metadata: { type: 'object', enabled: true }
              }
            }
          }
        });
        logger.info(`Created Elasticsearch index: ${this.indexName}`);
      } else {
        logger.info(`Elasticsearch index already exists: ${this.indexName}`);
      }
    } catch (error: any) {
      logger.error('Failed to initialize Elasticsearch index', {
        error: error.message
      });
    }
  }

  public async indexLog(log: LogEntry): Promise<void> {
    try {
      await this.client.index({
        index: this.indexName,
        document: {
          ...log,
          '@timestamp': new Date(log.timestamp).toISOString()
        }
      });
    } catch (error: any) {
      logger.error('Failed to index log', {
        error: error.message,
        log
      });
      throw error;
    }
  }

  public async searchLogs(query: LogQuery): Promise<LogSearchResult> {
    try {
      const must: any[] = [];

      if (query.service) {
        must.push({ term: { service: query.service } });
      }

      if (query.level) {
        must.push({ term: { level: query.level } });
      }

      if (query.traceId) {
        must.push({ term: { traceId: query.traceId } });
      }

      if (query.startTime || query.endTime) {
        const range: any = {};
        if (query.startTime) range.gte = query.startTime;
        if (query.endTime) range.lte = query.endTime;
        must.push({ range: { timestamp: range } });
      }

      const result = await this.client.search({
        index: this.indexName,
        body: {
          query: must.length > 0 ? { bool: { must } } : { match_all: {} },
          sort: [{ timestamp: { order: 'desc' } }],
          size: query.limit || 100
        }
      });

      const logs = result.hits.hits.map((hit: any) => hit._source as LogEntry);

      return {
        total: typeof result.hits.total === 'number' ? result.hits.total : result.hits.total?.value || 0,
        logs
      };
    } catch (error: any) {
      logger.error('Failed to search logs', {
        error: error.message,
        query
      });
      throw error;
    }
  }

  public async getLogsByTraceId(traceId: string): Promise<LogEntry[]> {
    const result = await this.searchLogs({ traceId, limit: 1000 });
    return result.logs;
  }

  public async getStats() {
    try {
      const result = await this.client.search({
        index: this.indexName,
        body: {
          size: 0,
          aggs: {
            by_service: {
              terms: { field: 'service' }
            },
            by_level: {
              terms: { field: 'level' }
            },
            recent_logs: {
              date_histogram: {
                field: 'timestamp',
                calendar_interval: 'hour'
              }
            }
          }
        }
      });

      return {
        total: typeof result.hits.total === 'number' ? result.hits.total : result.hits.total?.value || 0,
        aggregations: result.aggregations
      };
    } catch (error: any) {
      logger.error('Failed to get stats', { error: error.message });
      throw error;
    }
  }

  public async healthCheck(): Promise<boolean> {
    try {
      const health = await this.client.cluster.health();
      return health.status === 'green' || health.status === 'yellow';
    } catch (error) {
      return false;
    }
  }
}
