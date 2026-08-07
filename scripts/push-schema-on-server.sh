#!/bin/sh
# One-shot schema push against Dokploy Postgres from the host machine.
# Usage: ./scripts/push-schema-on-server.sh 'postgresql://user:pass@host:5432/db'

set -e

DATABASE_URL="${1:-$DATABASE_URL}"
if [ -z "$DATABASE_URL" ]; then
  echo "Usage: $0 'postgresql://hostingit:PASSWORD@hostingit-panel-vzx48-db-jzetsy:5432/hostingit'"
  exit 1
fi

CONTAINER="${POSTGRES_CONTAINER:-hostingit-panel-vzx48-db-jzetsy.1.uizbhg3mjik3065c75nlza1p4}"
NETWORK=$(docker inspect "$CONTAINER" --format '{{range $k, $v := .NetworkSettings.Networks}}{{$k}}{{end}}')

echo "Using network: $NETWORK"

docker run --rm \
  --network "$NETWORK" \
  -e DATABASE_URL="$DATABASE_URL" \
  node:22-alpine sh -c "
    apk add --no-cache git &&
    git clone --depth 1 https://github.com/HostingIt/HostingIt.git /tmp/app &&
    cd /tmp/app &&
    npm ci &&
    npm run db:push
  "

echo "Done. Verify with: docker exec -it $CONTAINER psql -U hostingit -d hostingit -c '\\dt'"
