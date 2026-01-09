# Changelog

All notable changes to this project will be documented in this file.

## [1.1.1] - 2026-01-09
### Added
- CJS build support for CommonJS compatibility
- `build:cjs` script to generate .cjs files from .js
- `postbuild` script to automatically run CJS build after TypeScript build
- `prepare` and `prepublishOnly` scripts to ensure CJS files are generated
- `scripts/build-cjs.cjs` for ESM to CommonJS conversion
- Fixes MODULE_NOT_FOUND error when CommonJS projects require .cjs files
## [1.1.2] - 2026-01-09
### Fixed
- Improved CJS build script for better CommonJS compatibility
- Enhanced postinstall checks for PTY provider verification
- Updated documentation for PTY dependency management
- Stability improvements for Termux and Linux ARM64 environments



## [1.1.0] - 2026-01-08
### Added
- Initial release of PTY Termux Utils
- Multi-provider PTY support (@mmmbuto/node-pty-android-arm64, @lydell/node-pty-linux-arm64)
- Graceful fallback to child_process adapter
- Type-safe PTY interfaces
- Debug logging with PTY_DEBUG environment variable
- Platform detection for Termux and Linux ARM64
- ESM and CommonJS compatibility
