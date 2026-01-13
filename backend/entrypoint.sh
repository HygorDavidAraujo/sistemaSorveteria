#!/bin/bash
set -euo pipefail

# Safe-by-default entrypoint.
# - Never performs destructive schema operations.
# - Respects the container CMD/compose "command".

echo "[entrypoint] Starting GELATINI backend container..."

# Prisma client generation is safe and required in many setups.
echo "[entrypoint] Generating Prisma Client..."
npx prisma generate

# Optional migrations (safe). Enable by setting RUN_MIGRATIONS=true.
RUN_MIGRATIONS=${RUN_MIGRATIONS:-false}
if [ "$RUN_MIGRATIONS" = "true" ]; then
	echo "[entrypoint] Applying database migrations (prisma migrate deploy)..."
	npx prisma migrate deploy
fi

# Optional seed. Enable by setting RUN_SEED=true.
RUN_SEED=${RUN_SEED:-false}
if [ "$RUN_SEED" = "true" ]; then
	echo "[entrypoint] Seeding database..."
	npm run db:seed || echo "[entrypoint] Seed failed (continuing)"
fi

if [ "$#" -gt 0 ]; then
	echo "[entrypoint] Executing command: $*"
	exec "$@"
fi

if [ "${NODE_ENV:-development}" = "production" ]; then
	echo "[entrypoint] No command provided; defaulting to production server (npm run start)"
	exec npm run start
fi

echo "[entrypoint] No command provided; defaulting to dev server"
exec npm run dev
