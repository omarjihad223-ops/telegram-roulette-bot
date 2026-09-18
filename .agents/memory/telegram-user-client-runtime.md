---
name: Telegram user client runtime
description: Runtime dependency constraint for the GramJS delivery-account session
---

The bundled Telegram user client must either bundle the WebSocket helper fallbacks or ship `bufferutil` and `utf-8-validate` as API-server runtime dependencies; otherwise the API can compile successfully but fail during startup when GramJS loads its WebSocket transport.

**Why:** The bundler can leave the WebSocket native helpers as runtime requires, and production dependency pruning can remove them even when local typechecks and builds pass.

**How to apply:** Prefer bundling the helper packages and their fallbacks; if they are externalized, keep both packages in the production image and verify the managed API workflow after any GramJS or bundler change.