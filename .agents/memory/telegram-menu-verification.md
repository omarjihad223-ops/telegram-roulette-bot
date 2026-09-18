---
name: Telegram menu verification
description: Telegram menu writes must be checked against the returned menu state before claiming success.
---

Do not claim a Telegram Mini App menu button was updated solely because `setChatMenuButton` returned success.

**Why:** In this environment, both SDK and direct JSON API writes were acknowledged, but the corresponding default-menu read still returned a commands menu. The cause was not established; do not assume this is only an SDK serialization bug.

**How to apply:** Read the same menu scope and compare its type and URL with the requested state. Keep the bot's `/start` link configuration separate from menu-button status, and report any unresolved mismatch accurately.