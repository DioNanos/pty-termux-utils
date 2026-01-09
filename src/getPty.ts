import type { PtyImplementation, IPtyNativeImplementation, IPtySpawnOptions, PtyProviderName } from './types.js';
import { logDebug, logError } from './config.js';
import { PtyError } from './errors.js';

let cached: PtyImplementation | undefined;

const isTermux =
  process.platform === 'android' ||
  process.env.PREFIX?.includes('com.termux');

const isLinuxArm64 =
  process.platform === 'linux' && process.arch === 'arm64';

const loadProvider = async (
  moduleName: string,
  name: PtyProviderName
): Promise<PtyImplementation> => {
  try {
    const mod = await import(moduleName);
    const impl = (mod as any).default ?? mod;
    
    if (!impl?.spawn) {
      logDebug('Native module invalid export: missing spawn function');
      return null;
    }
    
    logDebug('Native module loaded:', moduleName);
    return { module: impl, name };
  } catch (e) {
    if (e instanceof Error && e.code !== 'MODULE_NOT_FOUND') {
      logError('Unexpected error loading native module:', e);
    }
    return null;
  }
};

export const getPty = async (): Promise<PtyImplementation> => {
  if (cached !== undefined) return cached;

  // Priority 1: Termux → use @mmmbuto/node-pty-android-arm64
  if (isTermux) {
    const pty = await loadProvider(
      '@mmmbuto/node-pty-android-arm64',
      'mmmbuto-node-pty'
    );
    if (pty) return (cached = pty);
    logDebug('Termux PTY not found, trying next provider');
  }

  // Priority 2: Non-Termux Linux ARM64 → try @lydell/node-pty-linux-arm64
  if (!isTermux && isLinuxArm64) {
    const pty = await loadProvider(
      '@lydell/node-pty-linux-arm64',
      'lydell-node-pty-linux-arm64'
    );
    if (pty) return (cached = pty);
    logDebug('Linux ARM64 PTY not found, using fallback adapter');
  }

  // Priority 3: Fallback to child_process
  logDebug('Using fallback PTY adapter with child_process');
  return (cached = null);
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
