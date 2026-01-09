# PTY Termux Utils — Shared PTY Library for Termux/Android

<p align="center">
  Lightweight PTY (pseudo-terminal) utilities for Node.js on Termux/Android
</p>

---

## Overview

`@mmmbuto/pty-termux-utils` is a shared library that provides unified PTY management for Termux/Android environments. It offers native PTY support via `@mmmbuto/node-pty-android-arm64` with graceful fallback to `child_process` when unavailable. Type-safe, ESM+CJS compatible, and with consistent debug logging.

---

[![npm](https://img.shields.io/npm/v/@mmmbuto/pty-termux-utils?style=flat-square&logo=npm)](https://www.npmjs.com/package/@mmmbuto/pty-termux-utils)
[![downloads](https://img.shields.io/npm/dt/@mmmbuto/pty-termux-utils?style=flat-square)](https://www.npmjs.com/package/@mmmbuto/pty-termux-utils)
[![ko-fi](https://img.shields.io/badge/☕_Support-Ko--fi-FF5E5B?style=flat-square&logo=ko-fi)](https://ko-fi.com/dionanos)

---

## Features

- **Native PTY Support** — Uses `@mmmbuto/node-pty-android-arm64` prebuild on Termux/Android
- **Graceful Fallback** — Degrades to `child_process` adapter when native PTY unavailable
- **Type-Safe** — PTY types defined internally, no dependency on optional module
- **Memoized Loading** — Native module loaded once per process
- **Consistent Logging** — `[PTY]` prefix, debug-only via `PTY_DEBUG=1`
- **ESM + CJS** — Works with both TypeScript (ESM) and CommonJS (CJS) projects

## Installation

```bash
npm install @mmmbuto/pty-termux-utils
```

### Optional Native PTY

For native PTY support on Termux/Android:

```bash
npm install @mmmbuto/node-pty-android-arm64@~1.1.0
```

This is an **optional dependency** — the library works without it.

## Usage

### TypeScript (ESM)

```typescript
import { getPty, spawnPty } from '@mmmbuto/pty-termux-utils';

// Get PTY implementation
const pty = await getPty();
if (pty) {
  const proc = pty.module.spawn('bash', ['-c', 'echo test'], { cols: 80, rows: 24 });
  proc.on('data', (data) => console.log(data));
  proc.on('exit', (code, signal) => console.log(`Exit: ${code}`));
}

// Or spawn directly with error handling
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
  proc = pty.module.spawn('bash', ['-c', 'echo test'], { cols: 80, rows: 24 });
} else {
  const adapter = createFallbackAdapter();
  proc = adapter.spawn('bash', ['-c', 'echo test'], { cols: 80, rows: 24 });
}
```

### CommonJS (CJS)

```javascript
const { getPty, createFallbackAdapter } = require('@mmmbuto/pty-termux-utils');

async function runCommand() {
  const pty = await getPty();
  if (pty) {
    const proc = pty.module.spawn('bash', ['-c', 'echo test'], { cols: 80, rows: 24 });
    // ... use proc
  }
}

runCommand();
```

## Debug Logging

Enable debug logging:

```bash
PTY_DEBUG=1 npm run start
```

Output:
```
[PTY] Native module loaded: @mmmbuto/node-pty-android-arm64
[PTY] Using fallback PTY adapter with child_process
[PTY] Failed to initialize PTY system: Error: ...
```

## API

### `getPty() → Promise<PtyImplementation | null>`

Detect and load native PTY module. Returns `null` if unavailable.

### `spawnPty(file, args, options) → Promise<IPty>`

Spawn a PTY process. Throws `PtyError` on failure.

### `createFallbackAdapter() → IPtyAdapter`

Create a fallback adapter using `child_process`.

### Types

- `IPty` — PTY process interface
- `IPtyNativeImplementation` — Native module interface
- `PtyImplementation` — Union type for loaded implementation
- `PtyError` — Error with specific codes (`NATIVE_NOT_FOUND`, `NATIVE_INVALID_EXPORT`, `SPAWN_FAILED`, `RESIZE_FAILED`)

## Architecture

### Core Components

1. **`getPty.ts`** — PTY Detection & Loading
   - Detects Android/Termux environment
   - Dynamic import of native module
   - Memoizes result (cached after first call)
   - Validates `spawn` function exists

2. **`pty-adapter.ts`** — Fallback Adapter
   - Implements PTY-like interface using `child_process`
   - Handles stdout/stderr streams
   - Emits `data` and `exit` events
   - Provides `write()`, `kill()`, `resize()` (no-op)

3. **`types.ts`** — Type Definitions
   - Type-safe PTY interfaces
   - No dependency on optional module

4. **`errors.ts`** — Error Handling
   - `PtyError` with specific codes
   - Graceful degradation

5. **`config.ts`** — Configuration & Logging
   - `PTY_DEBUG` environment variable
   - `[PTY]` prefix logging

## Integration Guide

### For TypeScript Projects

1. Add dependency:
```bash
npm install @mmmbuto/pty-termux-utils
```

2. Replace local `getPty.ts` with re-export:
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

4. Keep optional dependency:
```json
{
  "optionalDependencies": {
    "@mmmbuto/node-pty-android-arm64": "~1.1.0"
  }
}
```

### For CommonJS Projects

1. Add dependency:
```bash
npm install @mmmbuto/pty-termux-utils
```

2. Create wrapper:
```javascript
const { getPty, spawnPty } = require('@mmmbuto/pty-termux-utils');

module.exports = { getPty, spawnPty };
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

## Performance

- `getPty()` is memoized — only loads module once per process
- Dynamic import only on Android/Termux
- Minimal overhead on non-Android platforms
- Debug logging only when `PTY_DEBUG=1`

## Related Projects

- **`@mmmbuto/node-pty-android-arm64`** — Native PTY module for Termux
- **`gemini-cli-termux`** — Gemini CLI using this library
- **`qwen-code-termux`** — Qwen CLI using this library
- **`nexuscli`** — Multi-model CLI using this library

## Documentation

- **[Architecture Guide](./docs/PTY_ARCHITECTURE.md)** — Detailed architecture and integration guide

## License

MIT
