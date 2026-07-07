import { Logger as TypeOrmLogger, QueryRunner } from 'typeorm';
import { logger } from './logger';

export class TypeOrmPinoLogger implements TypeOrmLogger {
  logQuery(query: string, parameters?: any[], queryRunner?: QueryRunner) {
    if (logger.level === 'debug' || logger.level === 'trace') {
      logger.debug({ query, parameters }, 'Database query');
    }
  }

  logQueryError(error: string | Error, query: string, parameters?: any[], queryRunner?: QueryRunner) {
    logger.error(
      {
        err: error instanceof Error ? error : new Error(String(error)),
        query,
        parameters,
      },
      'Database query failed',
    );
  }

  logQuerySlow(time: number, query: string, parameters?: any[], queryRunner?: QueryRunner) {
    logger.warn(
      {
        durationMs: time,
        query,
        parameters,
      },
      'Database slow query warning',
    );
  }

  logSchemaBuild(message: string, queryRunner?: QueryRunner) {
    logger.info({ message }, 'Database schema build');
  }

  logMigration(message: string, queryRunner?: QueryRunner) {
    logger.info({ migrationMessage: message }, 'Database migration');
  }

  log(level: 'log' | 'info' | 'warn', message: any, queryRunner?: QueryRunner) {
    if (level === 'warn') {
      logger.warn({ message }, 'Database warning');
    } else {
      logger.info({ message }, 'Database log');
    }
  }
}
