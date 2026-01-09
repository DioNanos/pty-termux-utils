# PTY Architecture — @mmmbuto/pty-termux-utils

**Version**: 1.1.0  
**Date**: 2026-01-09  
**Author**: DAG

## Overview

This library provides a unified PTY (pseudo-terminal) interface for Termux/Android and Linux ARM64 environments with graceful fallback to `child_process` when native PTY modules are unavailable.

## Design Principles

1. **Multi-Provider Strategy**: Priority-based PTY provider selection
2. **Single Source of Truth**: All PTY logic centralized in one library
3. **Type Safety**: PTY types defined internally, not from optional modules
4. **Graceful Fallback**: Silent, stable fallback when native PTY unavailable
5. **Consistent Logging**: `[PTY]` prefix, debug-only (via `PTY_DEBUG=1`)
6. **ESM + CJS Compatible**: Works with both TypeScript (ESM) and CommonJS (CJS)

## Architecture

### PTY Provider Hierarchy

```
Priority 1: Termux
  → @mmmbuto/node-pty-android-arm64 (~1.1.0)
  → Trigger: process.platform === 'android' || process.env.PREFIX?.includes('com.termux')
  → Reason: Prebuild for Termux, no compilation needed

Priority 2: Linux ARM64 (non-Termux)
  → @lydell/node-pty-linux-arm64 (~1.2.0-beta.2)
  → Trigger: process.platform === 'linux' && process.arch === 'arm64'
  → Reason: Official node-pty prebuild for ARM64

Priority 3: Fallback
  → child_process adapter
  → Trigger: Always available
  → Reason: Universal, works everywhere
```

### Core Components

#### 1. `getPty.ts` — PTY Detection & Loading

**Purpose**: Multi-provider PTY module loading with priority system

**Key Features**:
- Platform detection (Termux, Linux ARM64)
- Provider priority (Termux > Linux ARM64 > Fallback)
- Dynamic module import with error handling
- Memoization (cached after first call)
- Export validation (checks `spawn` function)

**Detection Logic**:
```typescript
const isTermux = 
  process.platform === 'android' ||
  process.env.PREFIX?.includes('com.termux');

const isLinuxArm64 = 
  process.platform === 'linux' && 
  process.arch === 'arm64';
```

**Provider Loading**:
```typescript
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
```

#### 2. `pty-adapter.ts` — Fallback Adapter

**Purpose**: Implements PTY-like interface using `child_process`

**Key Features**:
- PTY-compatible interface (spawn, data, exit events)
- stdout/stderr stream handling
- write, kill, resize methods
- No-op resize (fallback limitation)

**Implementation**:
```typescript
class PtyAdapterProcess implements IPtyAdapterProcess {
  constructor(proc: ChildProcess) {
    this.process = proc;
    
    proc.stdout?.on('data', (data: Buffer) => {
      this.dataListeners.forEach(listener => 
        listener(data.toString())
      );
    });

    proc.on('exit', (code, signal) => {
      this.exitListeners.forEach(listener => 
        listener(code ?? -1, signal ?? 0)
      );
    });
  }

  write(data: string): void {
    this.process.stdin?.write(data);
  }

  resize(_cols: number, _rows: number): void {
    logDebug('Resize not supported in fallback adapter');
  }

  kill(): void {
    this.process.kill();
  }
}
```

#### 3. `types.ts` — Type Definitions

**Purpose**: Type-safe PTY interfaces with multi-provider support

**Key Types**:
```typescript
export type PtyProviderName =
  | 'mmmbuto-node-pty'
  | 'lydell-node-pty-linux-arm64';

export type PtyImplementation = {
  module: IPtyNativeImplementation;
  name: PtyProviderName;
} | null;
```

**Design**:
- Provider name union for logging/debugging
- No dependency on optional module types
- ESM + CJS compatible exports

#### 4. `errors.ts` — Error Handling

**Purpose**: Structured error handling for PTY operations

**Error Codes**:
| Code | Description | Handling |
|------|-------------|----------|
| `NATIVE_NOT_FOUND` | Module not installed | Use fallback adapter |
| `NATIVE_INVALID_EXPORT` | Module missing `spawn` | Use fallback adapter |
| `SPAWN_FAILED` | Process spawn failed | Log error, retry or fallback |
| `RESIZE_FAILED` | Resize not supported | Log debug, ignore |

**Implementation**:
```typescript
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
```

#### 5. `config.ts` — Configuration & Logging

**Purpose**: Environment-based configuration and logging

**Configuration**:
```typescript
export const PTY_DEBUG = process.env.PTY_DEBUG === '1';

export function logDebug(message: string, ...args: unknown[]): void {
  if (PTY_DEBUG) {
    console.debug(`[PTY] ${message}`, ...args);
  }
}

export function logError(message: string, error?: unknown): void {
  console.error(`[PTY] ${message}`, error || '');
}
```

## Usage Patterns

### Basic Usage

```typescript
import { getPty, spawnPty } from '@mmmbuto/pty-termux-utils';

// Option 1: Get implementation and spawn manually
const pty = await getPty();
if (pty) {
  console.log('Using provider:', pty.name); // 'mmmbuto-node-pty' or 'lydell-node-pty-linux-arm64'
  const proc = pty.module.spawn('bash', ['-c', 'echo test'], { cols: 80, rows: 24 });
  // ... use proc
}

// Option 2: Direct spawn with error handling
try {
  const proc = await spawnPty('bash', ['-c', 'echo test'], { cols: 80, rows: 24 });
} catch (e) {
  if (e instanceof PtyError && e.code === 'NATIVE_NOT_FOUND') {
    // Fallback to child_process
  }
}
```

### Fallback Pattern

```typescript
import { getPty, createFallbackAdapter } from '@mmmbuto/pty-termux-utils';

const pty = await getPty();
let proc;

if (pty) {
  console.log('Using provider:', pty.name);
  proc = pty.module.spawn('bash', ['-c', 'echo test'], { cols: 80, rows: 24 });
} else {
  const adapter = createFallbackAdapter();
  proc = adapter.spawn('bash', ['-c', 'echo test'], { cols: 80, rows: 24 });
}
```

## Integration Guide

### TypeScript Projects (Gemini CLI, Qwen Code)

1. Add dependency:
```bash
npm install @mmmbuto/pty-termux-utils
```

2. Replace `getPty.ts` with re-export:
```typescript
export * from '@mmmbuto/pty-termux-utils';
```

3. Update type imports:
```typescript
// Before
import type { IPty } from '@mmmbuto/node-pty-android-arm64';

// After
import type { IPty } from '@mmmbuto/pty-termux-utils';
```

4. Update `executionMethod` union:
```typescript
executionMethod:
  | 'mmmbuto-node-pty'
  | 'lydell-node-pty-linux-arm64'
  | 'child_process'
  | 'none';
```

5. Keep optional dependencies:
```json
{
  "optionalDependencies": {
    "@mmmbuto/node-pty-android-arm64": "~1.1.0",
    "@lydell/node-pty-linux-arm64": "~1.2.0-beta.2"
  }
}
```

### CommonJS Projects (NexusCLI)

1. Add dependency:
```bash
npm install @mmmbuto/pty-termux-utils
```

2. Create wrapper:
```javascript
// lib/server/lib/pty-provider.js
const { getPty, spawnPty } = require('@mmmbuto/pty-termux-utils');

module.exports = { getPty, spawnPty };
```

3. Use in existing code:
```javascript
const { getPty } = require('./pty-provider');

async function runCommand() {
  const pty = await getPty();
  if (pty) {
    const proc = pty.module.spawn('bash', ['-c', 'echo test'], { cols: 80, rows: 24 });
    // ... use proc
  }
}
```

## Logging Examples

### Enable Debug Logging
```bash
PTY_DEBUG=1 npm run start
```

### Output Examples

**Termux with native PTY:**
```
[PTY] Native module loaded: @mmmbuto/node-pty-android-arm64
[PTY] Using provider: mmmbuto-node-pty
```

**Linux ARM64 with native PTY:**
```
[PTY] Native module loaded: @lydell/node-pty-linux-arm64
[PTY] Using provider: lydell-node-pty-linux-arm64
```

**Fallback to child_process:**
```
[PTY] Termux PTY not found, trying next provider
[PTY] Linux ARM64 PTY not found, using fallback adapter
[PTY] Using fallback PTY adapter with child_process
```

## Environment Detection

### Termux Detection
```typescript
process.platform === 'android' || 
process.env.PREFIX?.includes('com.termux')
```

### Linux ARM64 Detection
```typescript
process.platform === 'linux' && 
process.arch === 'arm64'
```

### Behavior Matrix

| Platform | Arch | Termux? | Module Used | Fallback? |
|----------|-------|----------|-------------|------------|
| Android/Termux | arm64 | Yes | @mmmbuto/node-pty-android-arm64 | If module unavailable |
| Linux | arm64 | No | @lydell/node-pty-linux-arm64 | If module unavailable |
| Linux | x64 | No | Fallback (no ARM64 PTY) | Always |
| Darwin (macOS) | arm64 | No | Fallback (no ARM64 PTY) | Always |
| Win32 | arm64 | No | Fallback (no ARM64 PTY) | Always |
| Other | Any | No | Fallback | Always |

## Error Handling

### PtyError Codes

| Code | Description | Handling |
|------|-------------|----------|
| `NATIVE_NOT_FOUND` | Module not installed | Use fallback adapter |
| `NATIVE_INVALID_EXPORT` | Module missing `spawn` | Use fallback adapter |
| `SPAWN_FAILED` | Process spawn failed | Log error, retry or fallback |
| `RESIZE_FAILED` | Resize not supported | Log debug, ignore |

### Error Handling Pattern

```typescript
try {
  const pty = await getPty();
  const proc = pty.module.spawn('bash', ['-c', 'echo test'], { cols: 80, rows: 24 });
} catch (e) {
  if (e instanceof PtyError) {
    switch (e.code) {
      case 'NATIVE_NOT_FOUND':
      case 'NATIVE_INVALID_EXPORT':
        // Use fallback adapter
        break;
      case 'SPAWN_FAILED':
        // Log error, retry or fallback
        break;
    }
  }
}
```

## Performance Considerations

- `getPty()` is memoized — only loads module once per process
- Dynamic import only on supported platforms
- Minimal overhead on unsupported platforms
- Debug logging only when `PTY_DEBUG=1`

## Maintenance Notes

- Version should follow semantic versioning
- Breaking changes require major version bump
- Keep optional dependencies at `~1.1.0` and `~1.2.0-beta.2` unless updated
- Update this doc when adding new providers

## Related Projects

- `@mmmbuto/node-pty-android-arm64`: Native PTY module for Termux
- `@lydell/node-pty-linux-arm64`: Native PTY module for Linux ARM64
- `gemini-cli-termux`: Gemini CLI using this library
- `qwen-code-termux`: Qwen CLI using this library
- `nexuscli`: Multi-model CLI using this library (via CJS wrapper)

## License

MIT
