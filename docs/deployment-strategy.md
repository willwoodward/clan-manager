# Deployment Strategy

**Target**: Single Clan • Small Scale • Cost Optimized
**Last Updated**: December 2024

---

## Architecture Overview

```
┌─────────────────────────────────────────┐
│  GitHub Pages (Frontend)                │
│  - Static React build                   │
│  - Free hosting                          │
│  - Automatic HTTPS                       │
└──────────────┬──────────────────────────┘
               │ HTTPS requests
               ↓
┌─────────────────────────────────────────┐
│  DigitalOcean Droplet (1GB RAM)         │
│  ┌───────────────────────────────────┐  │
│  │  Docker Compose                   │  │
│  │  ├─ Backend (FastAPI)             │  │
│  │  └─ Redis                         │  │
│  └───────────────────────────────────┘  │
│                                          │
│  Volume Mounts:                          │
│  - /var/clan-data (SQLite + files)      │
└─────────────────────────────────────────┘
```

**Monthly Cost**: ~$6/month (1GB droplet)

---

## 1. Frontend Deployment (GitHub Pages)

### Setup

1. **Build Configuration**
```json
// package.json
{
  "scripts": {
    "build": "tsc -b && vite build",
    "preview": "vite preview"
  }
}
```

2. **Vite Config for GitHub Pages**
```typescript
// vite.config.ts
export default defineConfig({
  base: '/clan-manager/', // Your repo name
  plugins: [react()],
  build: {
    outDir: 'dist',
    sourcemap: false,
  }
})
```

3. **Environment Variables**
```env
# .env.production
VITE_API_URL=https://api.your-domain.com
VITE_CLAN_TAG=#29U8UJCUO
```

### GitHub Actions Workflow

```yaml
# .github/workflows/deploy-frontend.yml
name: Deploy Frontend to GitHub Pages

on:
  push:
    branches: [main]
    paths:
      - 'frontend/**'
      - '.github/workflows/deploy-frontend.yml'

permissions:
  contents: read
  pages: write
  id-token: write

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: frontend/package-lock.json

      - name: Install dependencies
        working-directory: ./frontend
        run: npm ci

      - name: Build
        working-directory: ./frontend
        env:
          VITE_API_URL: ${{ secrets.API_URL }}
          VITE_CLAN_TAG: ${{ secrets.CLAN_TAG }}
        run: npm run build

      - name: Setup Pages
        uses: actions/configure-pages@v4

      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: './frontend/dist'

      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```

**Enable in Repo**:
- Settings → Pages → Source: GitHub Actions

---

## 2. Backend Deployment (DigitalOcean)

### Droplet Specs
- **Size**: 1GB RAM / 1 vCPU / 25GB SSD ($6/month)
- **OS**: Ubuntu 22.04 LTS
- **Region**: Closest to your location

### Initial Setup

```bash
# SSH into droplet
ssh root@your-droplet-ip

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Install Docker Compose
apt-get update
apt-get install docker-compose-plugin -y

# Create app directory
mkdir -p /opt/clan-manager
cd /opt/clan-manager

# Create data directory (persistent storage)
mkdir -p /var/clan-data/{wars,events,activity,clan_games}
```

### Production Docker Compose

```yaml
# docker-compose.prod.yml
version: '3.8'

services:
  backend:
    image: ghcr.io/your-username/clan-manager-backend:latest
    container_name: clan-manager-backend
    restart: unless-stopped
    ports:
      - "8000:8000"
    environment:
      - COC_EMAIL=${COC_EMAIL}
      - COC_PASSWORD=${COC_PASSWORD}
      - CLAN_TAG=${CLAN_TAG}
      - CORS_ORIGINS=https://your-username.github.io
    volumes:
      - /var/clan-data:/app/data
    depends_on:
      - redis
    networks:
      - clan-network
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"

  redis:
    image: redis:7-alpine
    container_name: clan-manager-redis
    restart: unless-stopped
    command: redis-server --appendonly yes --maxmemory 256mb --maxmemory-policy allkeys-lru
    volumes:
      - redis-data:/data
    networks:
      - clan-network

networks:
  clan-network:
    driver: bridge

volumes:
  redis-data:
```

### Environment File

```bash
# /opt/clan-manager/.env
COC_EMAIL=your-email@example.com
COC_PASSWORD=your-password
CLAN_TAG=#29U8UJCUO
CORS_ORIGINS=https://your-username.github.io
```

---

## 3. Data Persistence Strategy

### Storage Layout

```
/var/clan-data/
├── clan_data.db          # SQLite database (main data)
├── wars/                 # War history JSON files
│   ├── war_12345.json
│   └── war_12346.json
├── events/               # Event logs
│   └── events.jsonl
├── activity/             # Player activity
│   └── player_activity.json
└── clan_games/           # Clan games sessions
    └── sessions.json
```

### Backup Strategy

**Automated Daily Backups**:

```bash
# /opt/clan-manager/backup.sh
#!/bin/bash

BACKUP_DIR="/var/backups/clan-manager"
DATE=$(date +%Y%m%d)

# Create backup directory
mkdir -p $BACKUP_DIR

# Backup data directory
tar -czf $BACKUP_DIR/data_$DATE.tar.gz /var/clan-data

# Keep only last 7 days
find $BACKUP_DIR -name "data_*.tar.gz" -mtime +7 -delete

# Optional: Upload to S3/Backblaze/etc
# aws s3 cp $BACKUP_DIR/data_$DATE.tar.gz s3://your-bucket/
```

**Crontab**:
```bash
# Run daily at 3 AM
0 3 * * * /opt/clan-manager/backup.sh >> /var/log/clan-backup.log 2>&1
```

### Volume Persistence

Data persists through:
- Host volume mount: `/var/clan-data` → container's `/app/data`
- Redis AOF persistence: `redis-data` volume
- Container restarts don't affect data

---

## 4. CI/CD Pipeline

### Backend Build & Deploy

```yaml
# .github/workflows/deploy-backend.yml
name: Deploy Backend to DigitalOcean

on:
  push:
    branches: [main]
    paths:
      - 'backend/**'
      - 'shared/**'
      - 'Dockerfile'
      - '.github/workflows/deploy-backend.yml'

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Log in to GitHub Container Registry
        uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Build and push Docker image
        uses: docker/build-push-action@v5
        with:
          context: .
          push: true
          tags: ghcr.io/${{ github.repository }}/backend:latest
          cache-from: type=gha
          cache-to: type=gha,mode=max

      - name: Deploy to DigitalOcean
        uses: appleboy/ssh-action@v1.0.0
        with:
          host: ${{ secrets.DROPLET_IP }}
          username: root
          key: ${{ secrets.SSH_PRIVATE_KEY }}
          script: |
            cd /opt/clan-manager
            docker-compose -f docker-compose.prod.yml pull backend
            docker-compose -f docker-compose.prod.yml up -d backend
            docker image prune -f
```

### Required GitHub Secrets

```
DROPLET_IP          # Your droplet's IP address
SSH_PRIVATE_KEY     # SSH key for droplet access
API_URL             # https://api.your-domain.com
CLAN_TAG            # #29U8UJCUO
```

---

## 5. Domain & SSL Setup

### Option A: Custom Domain (Recommended)

**Frontend**:
1. Add CNAME record: `www.your-domain.com` → `your-username.github.io`
2. GitHub Pages settings → Custom domain → `www.your-domain.com`
3. Automatic HTTPS via GitHub

**Backend**:
1. Add A record: `api.your-domain.com` → `your-droplet-ip`
2. Install Caddy (reverse proxy with auto-SSL):

```bash
# Install Caddy
apt install -y debian-keyring debian-archive-keyring apt-transport-https
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | tee /etc/apt/sources.list.d/caddy-stable.list
apt update
apt install caddy
```

**Caddyfile** (`/etc/caddy/Caddyfile`):
```
api.your-domain.com {
    reverse_proxy localhost:8000
}
```

```bash
systemctl reload caddy
```

### Option B: No Custom Domain

**Frontend**: `https://your-username.github.io/clan-manager`
**Backend**: `http://your-droplet-ip:8000`

*Note: HTTPS required for production. Use custom domain + Caddy.*

---

## 6. Deployment Checklist

### First-Time Setup

**GitHub**:
- [ ] Create repository secrets (DROPLET_IP, SSH_PRIVATE_KEY, etc.)
- [ ] Enable GitHub Pages (Settings → Pages)
- [ ] Add CNAME file if using custom domain

**DigitalOcean**:
- [ ] Create 1GB droplet (Ubuntu 22.04)
- [ ] Add SSH key during creation
- [ ] Configure firewall: Allow ports 22, 80, 443, 8000
- [ ] Install Docker & Docker Compose
- [ ] Create `/var/clan-data` directory
- [ ] Set up `/opt/clan-manager` with compose file
- [ ] Configure `.env` file
- [ ] Install Caddy (if using custom domain)

**Initial Deploy**:
```bash
# On droplet
cd /opt/clan-manager
docker-compose -f docker-compose.prod.yml up -d
docker-compose logs -f
```

### Regular Updates

**Frontend**:
- Push to `main` branch → Auto-deploys via GitHub Actions

**Backend**:
- Push to `main` branch → Builds Docker image → Auto-deploys to droplet
- Zero-downtime: `docker-compose up -d` only restarts changed containers

---

## 7. Monitoring & Maintenance

### Health Checks

```bash
# Check backend status
curl https://api.your-domain.com/health

# View logs
docker-compose -f docker-compose.prod.yml logs -f backend

# Container stats
docker stats
```

### Resource Monitoring

```bash
# Install htop
apt install htop -y

# Check disk usage
df -h /var/clan-data
```

### Log Rotation

Docker logging configured with:
- Max size: 10MB per file
- Max files: 3
- Total: ~30MB logs max

### Updates

```bash
# Update system
apt update && apt upgrade -y

# Update Docker images
cd /opt/clan-manager
docker-compose -f docker-compose.prod.yml pull
docker-compose -f docker-compose.prod.yml up -d
```

---

## 8. Cost Breakdown

| Service | Cost/Month | Notes |
|---------|------------|-------|
| GitHub Pages | **Free** | Unlimited bandwidth for public repos |
| DigitalOcean 1GB Droplet | **$6** | Basic droplet |
| Domain (optional) | $12/year | ~$1/month |
| **Total** | **$6-7/month** | Very cost-effective |

**Data Storage**:
- Current data: ~50MB (wars, events, activity)
- Growth: ~2GB/year estimate
- 25GB SSD droplet: 12+ years of data

---

## 9. Disaster Recovery

### Backup Restoration

```bash
# Stop containers
docker-compose -f docker-compose.prod.yml down

# Restore from backup
tar -xzf /var/backups/clan-manager/data_20241224.tar.gz -C /

# Restart containers
docker-compose -f docker-compose.prod.yml up -d
```

### Migration to New Droplet

```bash
# On old droplet
tar -czf /tmp/clan-data.tar.gz /var/clan-data

# Transfer to new droplet
scp /tmp/clan-data.tar.gz root@new-droplet-ip:/tmp/

# On new droplet
tar -xzf /tmp/clan-data.tar.gz -C /
# Follow setup steps above
```

---

## 10. Security Considerations

### Droplet Hardening

```bash
# Setup firewall
ufw allow 22
ufw allow 80
ufw allow 443
ufw allow 8000
ufw enable

# Disable root SSH (after creating sudo user)
# /etc/ssh/sshd_config
PermitRootLogin no
PasswordAuthentication no

# Auto-updates
apt install unattended-upgrades -y
dpkg-reconfigure -plow unattended-upgrades
```

### Environment Security

- Never commit `.env` files
- Use GitHub Secrets for CI/CD
- Rotate CoC API credentials periodically
- Keep Docker images updated

### CORS Configuration

```python
# backend/main.py
CORS_ORIGINS = os.getenv('CORS_ORIGINS', '').split(',')
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,  # Only your GitHub Pages domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

---

## Quick Start Commands

### Initial Deployment

```bash
# 1. Setup droplet
ssh root@your-droplet-ip
curl -fsSL https://get.docker.com | sh
mkdir -p /opt/clan-manager /var/clan-data

# 2. Clone repo or copy files
cd /opt/clan-manager
# Create docker-compose.prod.yml and .env

# 3. Start services
docker-compose -f docker-compose.prod.yml up -d

# 4. Check health
curl http://localhost:8000/health
```

### GitHub Setup

```bash
# Add secrets via GitHub UI:
# Settings → Secrets and variables → Actions → New repository secret

# Enable Pages:
# Settings → Pages → Source: GitHub Actions
```

---

## Conclusion

This deployment strategy provides:
- ✅ **Low cost**: $6/month
- ✅ **Automatic deployments**: Push to main = auto-deploy
- ✅ **Data persistence**: Volume mounts + backups
- ✅ **HTTPS**: Free via GitHub Pages + Caddy
- ✅ **Simple maintenance**: Docker Compose
- ✅ **Scalable**: Easy to upgrade droplet if needed

Perfect for a single-clan manager with room to grow!
