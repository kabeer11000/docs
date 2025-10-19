const isDev = process.env.NODE_ENV === 'development'

export const logger = {
  log: (...args: any[]) => isDev && console.log(...args),
  info: (...args: any[]) => isDev && console.info(...args),
  warn: (...args: any[]) => console.warn(...args), // Always warn
  error: (...args: any[]) => console.error(...args), // Always error
  trace: (...args: any[]) => isDev && console.trace(...args),

  // Scoped loggers
  auth: {
    log: (...args: any[]) => isDev && console.log('[Auth]', ...args),
    error: (...args: any[]) => console.error('[Auth]', ...args),
  },
  cloudstore: {
    log: (...args: any[]) => isDev && console.log('[CloudStore]', ...args),
    error: (...args: any[]) => console.error('[CloudStore]', ...args),
  },
  editor: {
    log: (...args: any[]) => isDev && console.log('[Editor]', ...args),
    error: (...args: any[]) => console.error('[Editor]', ...args),
  },
}