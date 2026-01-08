# PTY Architecture — @mmmbuto/pty-termux-utils

**Version**: 1.0.0  
**Date**: 2026-01-08  
**Author**: DAG

## Overview

This library provides a unified PTY (pseudo-terminal) interface for Termux/Android environments with graceful fallback to `child_process` when native PTY modules are unavailable.

## Design Principles

1. **Single Source of Truth**: All PTY logic centralized in one library
2. **Type Safety**: Types defined internally, not imported from optional modules
3. **Graceful Fallback**: Silent, stable fallback when native PTY unavailable
4. **Consistent Logging**: `[PTY]` prefix, debug-only by default (`PTY_DEBUG=1`)
5. **ESM + CJS Compatible**: Works with both TypeScript (ESM) and CommonJS (CJS) projects

## Architecture

### Core Components

#### 1. `getPty.ts` — PTY Detection & Loading
- Detects Android/Termux environment
- Dynamic import of native module (`@mmmbuto/node-pty-android-arm64`)
- Memoizes result (cached after first call)
- Normalizes exports (`module.default ?? module`)
- Validates `spawn` function exists

#### 2. `pty-adapter.ts` — Fallback Adapter
- Implements PTY-like interface using `child_process`
- Handles stdout/stderr streams
- Emits `data` and `exit` events
- Provides `write()`, `kill()`, `resize()` (no-op)

#### 3. `types.ts` — Type Definitions
- `IPtyNativeImplementation`: Native module interface
- `IPtySpawnOptions`: Spawn options
- `IPty`: Process interface (events + methods)
- `PtyImplementation`: Union type for loaded implementation
- `IPtyAdapter`: Fallback adapter interface
- `IPtyAdapterProcess`: Fallback process interface

#### 4. `errors.ts` — Error Handling
- `PtyError` with specific codes:
  - `NATIVE_NOT_FOUND`: Module not installed
  - `NATIVE_INVALID_EXPORT`: Module loaded but missing `spawn`
  - `SPAWN_FAILED`: Process spawn failed
  - `RESIZE_FAILED`: Resize operation failed

#### 5. `config.ts` — Configuration & Logging
- `PTY_DEBUG`: Enable debug logging via environment variable
- `logDebug()`: Debug-level logging with `[PTY]` prefix
- `logError()`: Error logging with `[PTY]` prefix

## Usage Patterns

### Basic Usage

```typescript
import { getPty, spawnPty } from '@mmmbuto/pty-termux-utils';

// Option 1: Get implementation and spawn manually
const pty = await getPty();
if (pty) {
  const proc = pty.module.spawn('bash', ['-c', 'echo test'], { cols: 80, rows: 24 });
  // ... use proc
}

// Option 2: Direct spawn with error handling
try {
  const proc = await spawnPty('bash', ['-c', 'echo test'], { cols: 80, rows: 24 });
  // ... use proc
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
export { getPty, spawnPty } from '@mmmbuto/pty-termux-utils';
```

3. Update type imports:
```typescript
// Before
import type { IPty } from '@mmmbuto/node-pty-android-arm64';

// After
import type { IPty } from '@mmmbuto/pty-termux-utils';
```

4. Keep optional dependency:
```json
{
  "optionalDependencies": {
    "@mmmbuto/node-pty-android-arm64": "~1.1.0"
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

### Output
```
[PTY] Native module loaded: @mmmbuto/node-pty-android-arm64
[PTY] Using fallback PTY adapter with child_process
[PTY] Failed to initialize PTY system: Error: ...
```

## Environment Detection

The library detects Android/Termux via:
- `process.platform === 'android'`
- `process.env.PREFIX?.includes('com.termux')`

On non-Android platforms, native PTY is skipped and `getPty()` returns `null`.

## Error Handling

### PtyError Codes

| Code | Description | Handling |
|------|-------------|----------|
| `NATIVE_NOT_FOUND` | Module not installed | Use fallback adapter |
| `NATIVE_INVALID_EXPORT` | Module missing `spawn` | Use fallback adapter |
| `SPAWN_FAILED` | Process spawn failed | Log error, retry or fallback |
| `RESIZE_FAILED` | Resize not supported | Log debug, ignore |

## Performance Considerations

- `getPty()` is memoized — only loads module once per process
- Dynamic import only on Android/Termux
- Minimal overhead on non-Android platforms
- Debug logging only when `PTY_DEBUG=1`

## Testing Strategy

1. Test with native module installed
2. Test without native module (fallback)
3. Test on non-Android platforms
4. Test spawn, write, resize, kill operations
5. Test event handlers (data, exit)
6. Test error scenarios (invalid exports, spawn failures)

## Maintenance Notes

- Version should follow semantic versioning
- Breaking changes require major version bump
- Keep optional dependency `~1.1.0` unless native module changes
- Update this doc when adding new features

## Related Projects

- `@mmmbuto/node-pty-android-arm64`: Native PTY module for Termux
- `gemini-cli-termux`: Gemini CLI using this library
- `qwen-code-termux`: Qwen CLI using this library
- `nexuscli`: Multi-model CLI using this library (via CJS wrapper)

## License

MIT
