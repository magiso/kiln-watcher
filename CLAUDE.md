@AGENTS.md

# Kiln Watcher

- Follow [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for where code goes and which way imports point. `lib/domain` is pure; I/O lives in `lib/server`; `app/` is thin.
- Follow [docs/TESTING.md](docs/TESTING.md). `npm test` stays offline. Never write to production Redis keys from tests or local dev (`KEY_PREFIX=dev:kiln:` locally).
- UI must match [docs/design/README.md](docs/design/README.md) and use the design copy.
- Before pushing: `npm run lint && npm run typecheck && npm run test:coverage && npm run build`.
- Firmware lives in `firmware/` (PlatformIO, ESP32). Keep logic in `firmware/lib/` (pure C++, tested with `pio test -e native`); `src/main.cpp` is thin wiring. `firmware/test/fixtures/reading.json` is shared with the web app's tests.
