// Structured logger — JSON in production (Vercel-parseable), pretty-print in development.
// Usage: logger.info("trade created", { tradeId, userId })

type LogLevel = "info" | "warn" | "error"

interface LogEntry {
  timestamp: string
  level:     LogLevel
  message:   string
  context?:  Record<string, unknown>
}

const isProd = process.env.NODE_ENV === "production"

function write(level: LogLevel, message: string, context?: Record<string, unknown>) {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...(context && Object.keys(context).length > 0 ? { context } : {}),
  }

  if (isProd) {
    const fn = level === "error" ? console.error : level === "warn" ? console.warn : console.log
    fn(JSON.stringify(entry))
  } else {
    const prefix = level === "error" ? "❌" : level === "warn" ? "⚠️ " : "ℹ️ "
    const ctx    = context && Object.keys(context).length > 0 ? ` ${JSON.stringify(context)}` : ""
    const fn     = level === "error" ? console.error : level === "warn" ? console.warn : console.log
    fn(`${prefix} [${level.toUpperCase()}] ${entry.timestamp} ${message}${ctx}`)
  }
}

export const logger = {
  info:  (message: string, context?: Record<string, unknown>) => write("info",  message, context),
  warn:  (message: string, context?: Record<string, unknown>) => write("warn",  message, context),
  error: (message: string, context?: Record<string, unknown>) => write("error", message, context),
}
