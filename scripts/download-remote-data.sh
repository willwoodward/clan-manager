#!/bin/bash
# Download data from remote droplet
# This will download the remote data to a separate folder for comparison

set -e

REMOTE_HOST="root@138.68.159.29"
REMOTE_DATA_PATH="/var/clan-data/"
LOCAL_REMOTE_DATA_PATH="./data-remote"

echo "Downloading data from droplet..."
echo "Remote: ${REMOTE_HOST}:${REMOTE_DATA_PATH}"
echo "Local destination: ${LOCAL_REMOTE_DATA_PATH}"
echo ""

# Create local directory for remote data if it doesn't exist
mkdir -p "${LOCAL_REMOTE_DATA_PATH}"

# Download using rsync (preserves timestamps, permissions, etc.)
# -a: archive mode (preserves permissions, timestamps, etc.)
# -v: verbose
# -z: compress during transfer
# --progress: show progress
rsync -avz --progress \
  "${REMOTE_HOST}:${REMOTE_DATA_PATH}" \
  "${LOCAL_REMOTE_DATA_PATH}/"

echo ""
echo "Download complete!"
echo "Remote data is now in: ${LOCAL_REMOTE_DATA_PATH}"
echo ""
echo "You can now compare:"
echo "  Local data:  ./data/"
echo "  Remote data: ./data-remote/"
