#!/bin/bash
# Merge local and remote data according to specified preferences
#
# Merge strategy:
# - Activity: Use remote
# - Events: Use remote
# - War files: Combine both local and remote
# - Clan games: Use local
# - Other directories: Use remote (they're empty anyway)

set -e

LOCAL_DATA="./data"
REMOTE_DATA="./data-remote"
BACKUP_DIR="./data-backup-$(date +%Y%m%d_%H%M%S)"

echo "======================================"
echo "Data Merge Script"
echo "======================================"
echo ""
echo "This will merge data with the following strategy:"
echo "  - Activity data: FROM REMOTE"
echo "  - Events data: FROM REMOTE"
echo "  - War files: COMBINE both local and remote"
echo "  - Clan games: FROM LOCAL"
echo "  - Other directories: FROM REMOTE"
echo ""
echo "Your current local data will be backed up to:"
echo "  ${BACKUP_DIR}"
echo ""
read -p "Continue with merge? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
  echo "Merge cancelled."
  exit 0
fi

# Create backup of local data
echo ""
echo "Creating backup of local data..."
cp -r "${LOCAL_DATA}" "${BACKUP_DIR}"
echo "Backup created at: ${BACKUP_DIR}"

# Start merge
echo ""
echo "Starting merge..."

# 1. Copy activity from remote (overwrites local)
echo "  [1/5] Copying activity data from remote..."
rm -rf "${LOCAL_DATA}/activity"
cp -r "${REMOTE_DATA}/activity" "${LOCAL_DATA}/activity"

# 2. Copy events from remote (overwrites local)
echo "  [2/5] Copying events data from remote..."
rm -rf "${LOCAL_DATA}/events"
cp -r "${REMOTE_DATA}/events" "${LOCAL_DATA}/events"

# 3. Combine war files (keep local, add remote wars that don't exist locally)
echo "  [3/5] Combining war files from both sources..."
cp -n "${REMOTE_DATA}"/war_*.json "${LOCAL_DATA}/" 2>/dev/null || true

# 4. Keep local clan_games (do nothing)
echo "  [4/5] Keeping local clan games data..."

# 5. Copy other directories from remote (capital_raids, cwl, event_state, legend, seasons, wars)
echo "  [5/5] Copying other directories from remote..."
for dir in capital_raids cwl event_state legend seasons wars; do
  if [ -d "${REMOTE_DATA}/${dir}" ]; then
    rm -rf "${LOCAL_DATA}/${dir}"
    cp -r "${REMOTE_DATA}/${dir}" "${LOCAL_DATA}/${dir}"
  fi
done

echo ""
echo "======================================"
echo "Merge complete!"
echo "======================================"
echo ""
echo "Summary of merged data in ./data/:"
echo ""
echo "War files:"
find "${LOCAL_DATA}" -name "war_*.json" -type f -exec basename {} \; | sort
echo ""
echo "Activity files:"
find "${LOCAL_DATA}/activity" -type f -exec basename {} \; 2>/dev/null || echo "  (none)"
echo ""
echo "Events files:"
find "${LOCAL_DATA}/events" -type f -exec basename {} \; 2>/dev/null || echo "  (none)"
echo ""
echo "Clan games files:"
find "${LOCAL_DATA}/clan_games" -type f -exec basename {} \; 2>/dev/null || echo "  (none)"
echo ""
echo "Your original data is backed up at: ${BACKUP_DIR}"
echo ""
echo "If everything looks good, you can upload to the server with:"
echo "  ./scripts/upload-merged-data.sh"
