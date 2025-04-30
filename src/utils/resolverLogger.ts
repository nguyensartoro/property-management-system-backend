import { logger } from './logger';

/**
 * Simple resolver logger for GraphQL resolvers
 */
export const resolverLogger = {
  /**
   * Log resolver entry with parameters
   */
  log: (resolver: string, params?: any, userId: string = 'anonymous') => {
    logger.debug(`➡️ ${resolver}`, { userId, params });
  },

  /**
   * Log resolver error
   */
  error: (resolver: string, error: any) => {
    logger.error(`❌ ${resolver} failed`, {
      message: error?.message || 'Unknown error',
      stack: process.env.NODE_ENV === 'development' ? error?.stack : undefined
    });
  },

  /**
   * Log database operation
   */
  db: (operation: string, model: string, filter?: any) => {
    logger.debug(`🔍 DB: ${operation} ${model}`, filter);
  }
}; 