import { env } from '@/config/env'

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface LogContext {
  [key: string]: unknown
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
}

const currentLevel = env.NODE_ENV === 'production' ? 'info' : 'debug'

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= LOG_LEVELS[currentLevel]
}

function formatMessage(level: LogLevel, message: string, context?: LogContext): string {
  const timestamp = new Date().toISOString()
  const contextStr = context ? ` ${JSON.stringify(context)}` : ''
  return `[${timestamp}] [${level.toUpperCase()}] ${message}${contextStr}`
}

export const logger = {
  debug: (message: string, context?: LogContext) => {
    if (shouldLog('debug')) {
      console.debug(formatMessage('debug', message, context))
    }
  },

  info: (message: string, context?: LogContext) => {
    if (shouldLog('info')) {
      console.info(formatMessage('info', message, context))
    }
  },

  warn: (message: string, context?: LogContext) => {
    if (shouldLog('warn')) {
      console.warn(formatMessage('warn', message, context))
    }
  },

  error: (message: string, error?: Error | unknown, context?: LogContext) => {
    if (shouldLog('error')) {
      const errorContext =
        error instanceof Error
          ? { ...context, error: error.message, stack: error.stack }
          : { ...context, error }
      console.error(formatMessage('error', message, errorContext))
    }
  },

  // Request logging helper
  request: (method: string, url: string, statusCode: number, durationMs: number) => {
    logger.info(`${method} ${url} ${statusCode}`, { durationMs })
  },

  // AI operation logging
  ai: (operation: string, model: string, tokens: number, costUsd: number) => {
    logger.info(`AI ${operation}`, { model, tokens, costUsd })
  },
}
