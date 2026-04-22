# Focusnyx Browser Extension

Chrome/Firefox extension scaffold for the proposal's Dopamine Detox Engine.

## Responsibilities
- Enforce blocklist while Pomodoro is active
- Log blocked attempts
- Sync logs and settings with Focusnyx backend/PWA

## Structure
- `src/background/`: service worker and block logic
- `src/content/`: page-level enforcement helpers
- `src/popup/`: quick status and control UI
- `src/shared/`: shared constants and API utilities
