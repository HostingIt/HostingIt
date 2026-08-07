#!/bin/sh
set -e

# Apply Drizzle schema on startup (idempotent). Set RUN_DB_PUSH=false to skip.
if [ -n "$DATABASE_URL" ] && [ "${RUN_DB_PUSH:-true}" != "false" ]; then
  echo "Applying database schema..."
  if (
    cd /app/apps/web &&
    NODE_PATH=/app/db-node_modules /app/db-node_modules/.bin/drizzle-kit push --force
  ); then
    echo "Database schema ready."
  else
    echo "Warning: database schema push failed — starting app anyway."
  fi
fi

exec node /app/apps/web/server.js
