#!/bin/sh
set -e

echo "[entrypoint] Pushing Prisma schema..."
npx prisma db push --skip-generate --accept-data-loss

# Seed выполняется один раз: маркер лежит в uploads-volume,
# поэтому переживает пересоборку образа.
SEED_MARKER="/app/uploads/.seeded"
mkdir -p /app/uploads

if [ -f "$SEED_MARKER" ]; then
  echo "[entrypoint] Seed marker found ($SEED_MARKER) — skipping seed."
  echo "[entrypoint] Удалите этот файл, чтобы заново засеять demo-данные."
else
  echo "[entrypoint] Seeding database..."
  if npx prisma db seed; then
    touch "$SEED_MARKER"
    echo "[entrypoint] Seed complete, marker created."
  else
    echo "[entrypoint] Seed failed — marker not created, will retry on next start."
  fi
fi

echo "[entrypoint] Starting server..."
node dist/index.js
