type LogLevel = 'info' | 'warn' | 'error' | 'debug'

interface LogEntry {
  level: LogLevel
  message: string
  timestamp: string
  data?: Record<string, unknown>
}

class Logger {
  private formatLog(level: LogLevel, message: string, data?: Record<string, unknown>): LogEntry {
    return {
      level,
      message,
      timestamp: new Date().toISOString(),
      data,
    }
  }

  private log(level: LogLevel, message: string, data?: Record<string, unknown>) {
    const entry = this.formatLog(level, message, data)
    const prefix = `[${entry.timestamp}] [${level.toUpperCase()}]`

    if (level === 'error') {
      console.error(prefix, message, data || '')
    } else if (level === 'warn') {
      console.warn(prefix, message, data || '')
    } else {
      console.log(prefix, message, data || '')
    }
  }

  info(message: string, data?: Record<string, unknown>) {
    this.log('info', message, data)
  }

  warn(message: string, data?: Record<string, unknown>) {
    this.log('warn', message, data)
  }

  error(message: string, data?: Record<string, unknown>) {
    this.log('error', message, data)
  }

  debug(message: string, data?: Record<string, unknown>) {
    this.log('debug', message, data)
  }
}

export const logger = new Logger()
