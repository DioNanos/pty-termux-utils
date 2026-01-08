import type { PtyImplementation, IPtyNativeImplementation, IPtySpawnOptions } from './types.js';
import { logDebug, logError } from './config.js';
import { PtyError } from './errors.js';

let cached: PtyImplementation | undefined;

const isAndroid = process.platform === 'android' || process.env.PREFIX?.includes('com.termux');

export const getPty = async (): Promise<PtyImplementation> => {
  if (cached !== undefined) return cached;

  if (!isAndroid) {
    logDebug('Not on Android/Termux, skipping native PTY');
    return (cached = null);
  }

  try {
    const moduleName = '@mmmbuto/node-pty-android-arm64';
    const mod = await import(moduleName);
    const impl = (mod as any).default ?? mod;

    if (!impl?.spawn) {
      logDebug('Native module invalid export: missing spawn function');
      return (cached = null);
    }

    logDebug('Native module loaded:', moduleName);
    return (cached = { module: impl, name: 'mmmbuto-node-pty' });
  } catch (e) {
    logDebug('Native module not found, using fallback adapter');
    if (e instanceof Error && e.code !== 'MODULE_NOT_FOUND') {
      logError('Unexpected error loading native module:', e);
    }
    return (cached = null);
  }
};

export const spawnPty = async (
  file: string,
  args: string[],
  options: IPtySpawnOptions = {}
) => {
  const pty = await getPty();
  
  if (!pty) {
    throw new PtyError('Native PTY not available', 'NATIVE_NOT_FOUND');
  }

  try {
    return pty.module.spawn(file, args, options);
  } catch (e) {
    logError('Failed to spawn PTY process:', e);
    throw new PtyError(
      e instanceof Error ? e.message : 'Unknown spawn error',
      'SPAWN_FAILED'
    );
  }
};
