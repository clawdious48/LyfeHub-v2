#!/bin/bash
# Reset the drying-logs preview database to the clean seed state
# Usage: bash reset-test-db.sh

set -e

DATA_DIR="/root/lyfehub-v2-drying-data"
CONTAINER="lyfehub-v2-preview-drying"

echo "Stopping preview container..."
docker stop "$CONTAINER"

echo "Restoring seed database..."
cp "$DATA_DIR/kanban-seed.db" "$DATA_DIR/kanban.db"
cp "$DATA_DIR/kanban-seed.db-wal" "$DATA_DIR/kanban.db-wal" 2>/dev/null || true
cp "$DATA_DIR/kanban-seed.db-shm" "$DATA_DIR/kanban.db-shm" 2>/dev/null || true

echo "Starting preview container..."
docker start "$CONTAINER"

echo "Waiting for health check..."
sleep 3
curl -sf http://localhost:4001/api/health && echo "" && echo "✅ Preview reset and healthy!" || echo "❌ Health check failed"
