export const PTY_DEBUG = process.env.PTY_DEBUG === '1';

export function logDebug(message: string, ...args: unknown[]): void {
  if (PTY_DEBUG) {
    console.debug(`[PTY] ${message}`, ...args);
  }
}

export function logError(message: string, error?: unknown): void {
  console.error(`[PTY] ${message}`, error || '');
}
