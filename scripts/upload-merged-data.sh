#!/bin/bash
# Upload merged data back to the droplet
# WARNING: This will overwrite the data on the remote server!

set -e

REMOTE_HOST="root@138.68.159.29"
REMOTE_DATA_PATH="/var/clan-data/"
LOCAL_DATA_PATH="./data/"

echo "WARNING: This will overwrite data on the remote server!"
echo "Remote: ${REMOTE_HOST}:${REMOTE_DATA_PATH}"
echo "Local source: ${LOCAL_DATA_PATH}"
echo ""
read -p "Are you sure you want to continue? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
  echo "Upload cancelled."
  exit 0
fi

echo ""
echo "Uploading merged data to droplet..."

# Upload using rsync
# -a: archive mode
# -v: verbose
# -z: compress during transfer
# --progress: show progress
# --delete: delete files on remote that don't exist locally (keeps it in sync)
rsync -avz --progress --delete \
  "${LOCAL_DATA_PATH}" \
  "${REMOTE_HOST}:${REMOTE_DATA_PATH}"

echo ""
echo "Upload complete!"
echo ""
echo "You may need to restart the backend container to pick up changes:"
echo "  ssh ${REMOTE_HOST} 'cd /opt/clan-manager && docker compose -f docker-compose.prod.yml restart backend'"
