#!/bin/sh
# Vercel build: apply Prisma migrations, then build Next.js.
#
# Neon's connection pooler (PgBouncer, transaction mode) breaks the
# session-level advisory lock Prisma Migrate takes, which surfaces as
# "P1002 ... Timed out trying to acquire a postgres advisory lock". So:
#   1. Prefer a direct (unpooled) connection string when one is set.
#   2. Disable the advisory lock outright. It only guards against two
#      migrate processes running at once, which Vercel builds never do.
set -eu

MIGRATE_URL="${DATABASE_URL_UNPOOLED:-${POSTGRES_URL_NON_POOLING:-${DATABASE_URL:-}}}"
if [ -z "$MIGRATE_URL" ]; then
  echo "vercel-build: DATABASE_URL is not set" >&2
  exit 1
fi

case "$MIGRATE_URL" in
  *-pooler.*)
    echo "vercel-build: no unpooled connection string found; running migrations through the pooler" >&2
    ;;
esac

if [ "${SKIP_MIGRATIONS:-}" = "1" ]; then
  echo "vercel-build: SKIP_MIGRATIONS=1, skipping prisma migrate deploy"
else
  DATABASE_URL="$MIGRATE_URL" PRISMA_SCHEMA_DISABLE_ADVISORY_LOCK=1 npx prisma migrate deploy
fi

npx next build
