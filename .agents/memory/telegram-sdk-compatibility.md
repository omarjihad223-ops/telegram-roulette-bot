---
name: Telegram SDK compatibility
description: Why the imported bot keeps a compatible Telegram SDK instead of the registry's latest major version.
---

Treat a move to node-telegram-bot-api 2.x as a deliberate migration, not a routine dependency refresh.

**Why:** During the import, the registry's latest version resolved to 2.1.0, which did not provide the default TelegramBot export used throughout the uploaded bot. Installing it broke bot handlers and services; the compatible 0.x line retained the existing interface.

**How to apply:** Check the actual exported SDK API before upgrading the major version. Preserve existing behavior while fixing roulette issues; if upgrading later, account for bot construction, polling, event handlers and types together.