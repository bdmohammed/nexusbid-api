import { logger } from './logger';

import type { Logger as TypeOrmLogger, QueryRunner } from 'typeorm';

export class TypeOrmPinoLogger implements TypeOrmLogger {
  logQuery(query: string, parameters?: unknown[], _queryRunner?: QueryRunner) {
    if (logger.level === 'debug' || logger.level === 'trace') {
      // logger.debug({ query, parameters, queryRunner }, 'Database query');
      logger.debug({ query, parameters }, 'Database query');
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

  logQuerySlow(time: number, query: string, parameters?: unknown[], _queryRunner?: QueryRunner) {
    logger.warn(
      {
        durationMs: time,
        query,
        parameters,
        // queryRunner,
      },
      'Database slow query warning',
    );
  }

  logSchemaBuild(message: string, _queryRunner?: QueryRunner) {
    logger.info({ message }, 'Database schema build');
  }

  logMigration(message: string, _queryRunner?: QueryRunner) {
    logger.info({ migrationMessage: message }, 'Database migration');
  }

  log(level: 'log' | 'info' | 'warn', message: unknown, _queryRunner?: QueryRunner) {
    if (level === 'warn') {
      logger.warn({ message }, 'Database warning');
    } else {
      logger.info({ message }, 'Database log');
    }
  }
}
