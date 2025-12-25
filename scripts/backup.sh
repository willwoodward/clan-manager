#!/bin/bash

# Clan Manager Backup Script
# Run daily via cron: 0 3 * * * /opt/clan-manager/scripts/backup.sh

BACKUP_DIR="/var/backups/clan-manager"
DATE=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS=7

# Create backup directory
mkdir -p $BACKUP_DIR

echo "[$(date)] Starting backup..."

# Backup data directory
echo "Backing up /var/clan-data..."
tar -czf $BACKUP_DIR/data_$DATE.tar.gz /var/clan-data 2>/dev/null

if [ $? -eq 0 ]; then
    echo "[$(date)] Data backup successful: data_$DATE.tar.gz"
else
    echo "[$(date)] ERROR: Data backup failed!"
    exit 1
fi

# Backup size
SIZE=$(du -h $BACKUP_DIR/data_$DATE.tar.gz | cut -f1)
echo "[$(date)] Backup size: $SIZE"

# Clean up old backups (keep last 7 days)
echo "Cleaning up backups older than $RETENTION_DAYS days..."
find $BACKUP_DIR -name "data_*.tar.gz" -mtime +$RETENTION_DAYS -delete

# Count remaining backups
BACKUP_COUNT=$(ls -1 $BACKUP_DIR/data_*.tar.gz 2>/dev/null | wc -l)
echo "[$(date)] Current backup count: $BACKUP_COUNT"

# Optional: Upload to external storage
# Uncomment and configure if using S3/Backblaze/etc
# echo "Uploading to cloud storage..."
# aws s3 cp $BACKUP_DIR/data_$DATE.tar.gz s3://your-bucket/backups/
# rclone copy $BACKUP_DIR/data_$DATE.tar.gz remote:backups/

echo "[$(date)] Backup complete!"
