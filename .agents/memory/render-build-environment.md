---
name: Render frontend builds
description: Required environment variables for building the Bounty Rush frontend outside its managed workflow
---

The frontend Vite configuration intentionally requires both `PORT` and `BASE_PATH`; a direct build must provide them, while the Render Dockerfile supplies `PORT=10000` and `BASE_PATH=/`.

**Why:** Running the package build without those values fails before Vite transforms any source, even though the managed workflow already provides them.

**How to apply:** Use the Docker build for the deployment check, or set `PORT` and `BASE_PATH` explicitly for a standalone frontend build.