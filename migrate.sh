#!/bin/bash

set -e
set -a
source .env
set +a

docker run --rm \
  --network learning_appnet \
  -e DATABASE_URL="postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB}" \
  -v "$PWD":/app -w /app \
  node:20-bookworm-slim npx node-pg-migrate "$@"
