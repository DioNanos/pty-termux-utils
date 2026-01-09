# PTY Termux Utils — Shared PTY Library for Termux/Android

<p align="center">
  Lightweight PTY (pseudo-terminal) utilities for Node.js on Termux/Android
</p>

---

## Overview

`@mmmbuto/pty-termux-utils` is a shared library that provides unified PTY management for Termux/Android and Linux ARM64 environments. It offers native PTY support via `@mmmbuto/node-pty-android-arm64` or `@lydell/node-pty-linux-arm64` with graceful fallback to `child_process` when unavailable. Type-safe, ESM+CJS compatible, and with consistent debug logging.

---

[![npm](https://img.shields.io/npm/v/@mmmbuto/pty-termux-utils?style=flat-square&logo=npm)](https://www.npmjs.com/package/@mmmbuto/pty-termux-utils)
[![downloads](https://img.shields.io/npm/dt/@mmmbuto/pty-termux-utils?style=flat-square)](https://www.npmjs.com/package/@mmmbuto/pty-termux-utils)
[![ko-fi](https://img.shields.io/badge/☕_Support-Ko--fi-FF5E5B?style=flat-square&logo=ko-fi)](https://ko-fi.com/dionanos)

---

## Features

- **Multi-Provider PTY** — Native PTY support for Termux and Linux ARM64
- **Graceful Fallback** — Degrades to `child_process` adapter when native PTY unavailable
- **Type-Safe** — PTY types defined internally, no dependency on optional module
- **Memoized Loading** — Native module loaded once per process
- **Consistent Logging** — `[PTY]` prefix, debug-only via `PTY_DEBUG=1`
- **ESM + CJS** — Works with both TypeScript (ESM) and CommonJS (CJS) projects

## PTY Providers

| Priority | Platform | Provider | Module | Version |
|----------|-----------|----------|---------|----------|
| 1 | Termux | Native | `@mmmbuto/node-pty-android-arm64` | ~1.1.0 |
| 2 | Linux ARM64 | Native | `@lydell/node-pty-linux-arm64` | ~1.2.0-beta.2 |
| 3 | All platforms | Fallback | `child_process` adapter | built-in |

### Platform Detection

```typescript
// Termux detection
process.platform === 'android' || process.env.PREFIX?.includes('com.termux')

// Linux ARM64 detection
process.platform === 'linux' && process.arch === 'arm64'
```

## Installation

```bash
npm install @mmmbuto/pty-termux-utils@1.1.4
```

### Optional Native PTY

For native PTY support:

```bash
# Termux
npm install @mmmbuto/node-pty-android-arm64@~1.1.0

# Linux ARM64
npm install @lydell/node-pty-linux-arm64@~1.2.0-beta.2
```

These are **optional dependencies** — the library works without them.

## Usage

### TypeScript (ESM)

```typescript
import { getPty, spawnPty } from '@mmmbuto/pty-termux-utils';

// Get PTY implementation
const pty = await getPty();
if (pty) {
  console.log('Using provider:', pty.name); // 'mmmbuto-node-pty' or 'lydell-node-pty-linux-arm64'
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
  console.log('Using provider:', pty.name);
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
[PTY] Using provider: mmmbuto-node-pty
[PTY] Native module not found, using fallback adapter
[PTY] Using fallback PTY adapter with child_process
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
- `PtyProviderName` — Provider name union (`'mmmbuto-node-pty' | 'lydell-node-pty-linux-arm64'`)
- `PtyError` — Error with specific codes (`NATIVE_NOT_FOUND`, `NATIVE_INVALID_EXPORT`, `SPAWN_FAILED`, `RESIZE_FAILED`)

## Architecture

### Core Components

1. **`getPty.ts`** — PTY Detection & Loading
   - Multi-provider strategy with priority
   - Dynamic import of native modules
   - Memoizes result (cached after first call)
   - Validates `spawn` function exists

2. **`pty-adapter.ts`** — Fallback Adapter
   - Implements PTY-like interface using `child_process`
   - Handles stdout/stderr streams
   - Emits `data` and `exit` events
   - Provides `write()`, `kill()`, `resize()` (no-op)

3. **`types.ts`** — Type Definitions
   - Type-safe PTY interfaces
   - Multi-provider name union
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
npm install @mmmbuto/pty-termux-utils@1.1.4
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

4. Keep optional dependencies:
```json
{
  "optionalDependencies": {
    "@mmmbuto/node-pty-android-arm64": "~1.1.0",
    "@lydell/node-pty-linux-arm64": "~1.2.0-beta.2"
  }
}
```

### For CommonJS Projects

1. Add dependency:
```bash
npm install @mmmbuto/pty-termux-utils@1.1.4
```

2. Create wrapper:
```javascript
const { getPty, spawnPty } = require('@mmmbuto/pty-termux-utils');

module.exports = { getPty, spawnPty };
```

## Behavior Matrix

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

## Performance

- `getPty()` is memoized — only loads module once per process
- Dynamic import only on supported platforms
- Minimal overhead on unsupported platforms
- Debug logging only when `PTY_DEBUG=1`

## Related Projects

- **`@mmmbuto/node-pty-android-arm64`** — Native PTY module for Termux
- **`@lydell/node-pty-linux-arm64`** — Native PTY module for Linux ARM64
- **`gemini-cli-termux`** — Gemini CLI using this library
- **`qwen-code-termux`** — Qwen CLI using this library
- **`nexuscli`** — Multi-model CLI using this library

## Documentation

- **[Architecture Guide](./docs/PTY_ARCHITECTURE.md)** — Detailed architecture and integration guide


## Changelog

See [CHANGELOG.md](CHANGELOG.md) for version history.

## License

MIT
