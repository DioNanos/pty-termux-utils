# @mmmbuto/pty-termux-utils

Shared PTY (pseudo-terminal) utilities for Termux/Android with graceful fallback.

## Features

- 🚀 **Native PTY support** for Termux/Android via `@mmmbuto/node-pty-android-arm64`
- 🔄 **Graceful fallback** to `child_process` when native module unavailable
- 📝 **Type-safe** TypeScript definitions
- 🔍 **Debug logging** with `[PTY]` prefix (enable via `PTY_DEBUG=1`)
- 🎯 **ESM + CJS** compatible
- 💾 **Memoized** module loading

## Installation

```bash
npm install @mmmbuto/pty-termux-utils
```

### Optional Native Module

For native PTY support on Termux:

```bash
npm install @mmmbuto/node-pty-android-arm64@~1.1.0
```

This is an **optional dependency** — the library works without it.

## Usage

```typescript
import { getPty, spawnPty } from '@mmmbuto/pty-termux-utils';

// Get implementation
const pty = await getPty();
if (pty) {
  const proc = pty.module.spawn('bash', ['-c', 'echo test'], { cols: 80, rows: 24 });
  // Use native PTY
}

// Or spawn directly
try {
  const proc = await spawnPty('bash', ['-c', 'echo test'], { cols: 80, rows: 24 });
} catch (e) {
  // Handle errors or use fallback
}
```

## Fallback Pattern

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

## Debug Logging

Enable debug logging:

```bash
PTY_DEBUG=1 npm run start
```

Output:
```
[PTY] Native module loaded: @mmmbuto/node-pty-android-arm64
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
- `PtyError` — Error with specific codes

## Documentation

See [docs/PTY_ARCHITECTURE.md](docs/PTY_ARCHITECTURE.md) for detailed architecture and integration guide.

## License

MIT
