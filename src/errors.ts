export class PtyError extends Error {
  constructor(
    message: string,
    public code: 'NATIVE_NOT_FOUND' | 'NATIVE_INVALID_EXPORT' | 'SPAWN_FAILED' | 'RESIZE_FAILED'
  ) {
    super(message);
    this.name = 'PtyError';
    Error.captureStackTrace?.(this, PtyError);
  }
}
