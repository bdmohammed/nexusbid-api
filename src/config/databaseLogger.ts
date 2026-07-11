import { logger } from './logger';

import type { Logger as TypeOrmLogger, QueryRunner } from 'typeorm';

export class TypeOrmPinoLogger implements TypeOrmLogger {
  logQuery(query: string, parameters?: unknown[], queryRunner?: QueryRunner) {
    if (logger.level === 'debug' || logger.level === 'trace') {
      logger.debug({ query, parameters, queryRunner }, 'Database query');
    }
  }

  logQueryError(
    error: string | Error,
    query: string,
    parameters?: unknown[],
    queryRunner?: QueryRunner,
  ) {
    logger.error(
      {
        err: error instanceof Error ? error : new Error(String(error)),
        query,
        parameters,
        queryRunner,
      },
      'Database query failed',
    );
  }

  logQuerySlow(time: number, query: string, parameters?: unknown[], queryRunner?: QueryRunner) {
    logger.warn(
      {
        durationMs: time,
        query,
        parameters,
        queryRunner,
      },
      'Database slow query warning',
    );
  }

  logSchemaBuild(message: string, queryRunner?: QueryRunner) {
    logger.info({ message, queryRunner }, 'Database schema build');
  }

  logMigration(message: string, queryRunner?: QueryRunner) {
    logger.info({ migrationMessage: message, queryRunner }, 'Database migration');
  }

  log(level: 'log' | 'info' | 'warn', message: unknown, queryRunner?: QueryRunner) {
    if (level === 'warn') {
      logger.warn({ message, queryRunner }, 'Database warning');
    } else {
      logger.info({ message, queryRunner }, 'Database log');
    }
  }
}
