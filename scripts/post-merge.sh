#!/bin/bash
set -e

# Install any new dependencies (fast no-op when unchanged)
npm install --no-audit --no-fund

# Apply schema changes non-interactively.
# drizzle.config.ts excludes the connect-pg-simple "session" table, so
# --force will never drop it.
npm run db:push -- --force
