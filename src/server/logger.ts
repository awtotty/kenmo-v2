import * as Sentry from "@sentry/nextjs";

type LogLevel = "debug" | "info" | "warn" | "error";

type LogFields = Record<string, unknown>;

const SENSITIVE_KEY_PATTERN = /password|secret|token|authorization|cookie|dsn|key/i;

export const sanitizeLogFields = (fields: LogFields = {}): LogFields => {
  return Object.fromEntries(
    Object.entries(fields).map(([key, value]) => [
      key,
      SENSITIVE_KEY_PATTERN.test(key) ? "[redacted]" : value,
    ]),
  );
};

const writeLog = (level: LogLevel, message: string, fields: LogFields = {}) => {
  const entry = {
    level,
    message,
    timestamp: new Date().toISOString(),
    ...sanitizeLogFields(fields),
  };

  if (level === "error") {
    console.error(JSON.stringify(entry));
    return;
  }

  if (level === "warn") {
    console.warn(JSON.stringify(entry));
    return;
  }

  console.log(JSON.stringify(entry));
};

export const logger = {
  debug: (message: string, fields?: LogFields) => writeLog("debug", message, fields),
  info: (message: string, fields?: LogFields) => writeLog("info", message, fields),
  warn: (message: string, fields?: LogFields) => writeLog("warn", message, fields),
  error: (message: string, fields?: LogFields) => writeLog("error", message, fields),
};

export const captureException = (error: unknown, context: { operation: string } & LogFields) => {
  const sanitizedContext = sanitizeLogFields(context);

  logger.error("exception captured", {
    ...sanitizedContext,
    errorMessage: error instanceof Error ? error.message : String(error),
  });

  if (typeof Sentry.captureException === "function") {
    Sentry.captureException(error, {
      tags: {
        operation: context.operation,
      },
      extra: sanitizedContext,
    });
  }
};
