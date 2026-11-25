# Hosting Lepark 24/7 for $0 on Oracle Cloud (OCI) Always Free

This guide walks through deploying **Lepark** (`client`, `server`, `shared`, and PostgreSQL) 24/7 on a single **Oracle Cloud Infrastructure (OCI) Always Free** Ubuntu VM for **\$0/month**.

Because Lepark keeps live Colyseus rooms, Focus sessions, Squads, and email OTP codes in Node.js memory, running everything on one always-on VPS with Nginx + PM2 + Docker PostgreSQL avoids serverless cold starts and 15-minute sleep limits.

---

## Architecture on OCI

```text
Browser (HTTPS / WSS)
   │
   ▼
Nginx (Ports 80 & 443 + Let's Encrypt SSL)
   ├── /                  ──► Static files: /home/ubuntu/lepark/client/dist
   ├── /api, /health,
   │   /matchmake         ──► http://127.0.0.1:2567 (Express)
   └── /colyseus/         ──► ws://127.0.0.1:2567/  (Colyseus WebSockets)
                                 │
                                 ▼
                       Docker PostgreSQL 16 (127.0.0.1:5433)
```

---

## Phase 1: Create Your OCI Account & Free VM

1. **Sign up at [cloud.oracle.com](https://www.oracle.com/cloud/free/)**
   * You will need a **credit or debit card** for identity verification (you are **not** charged unless you manually upgrade to Pay-As-You-Go).
   * **Important — Home Region:** Choose a region geographically close to your players (for example, Singapore, Tokyo, or San Jose). **You cannot change your home region later**, and Always Free compute only runs in your home region.
   * **Stay on Free Tier:** After your 30-day promotional trial credits expire, **do not click Upgrade**—just keep resources within the `Always Free-eligible` limits below.

2. **Create the Compute Instance**
   * Go to **Compute → Instances → Create Instance**.
   * **Name:** `lepark-server`
   * **Image:** Click **Change Image** → **Ubuntu** → **Canonical Ubuntu 24.04** (make sure it supports `aarch64` / ARM).
   * **Shape:** Click **Change Shape** → **Virtual Machine** → **Ampere** → **`VM.Standard.A1.Flex`** (`Always Free-eligible`).
     * **OCPUs:** `2`
     * **Memory (RAM):** `12 GB`
     * *(If your region shows "Out of capacity for shape VM.Standard.A1.Flex", try `1 OCPU / 6 GB` first, retry at off-peak hours, or fall back to `VM.Standard.E2.1.Micro` AMD 1 GB RAM with external Neon Postgres.)*
   * **Networking:** Ensure **Assign a public IPv4 address** is selected.
   * **Add SSH Keys:** Choose **Generate a key pair for me** and download both the **private key** (`.key`) and **public key** (`.pub`). Keep the private key safe on your PC (e.g., `C:\Users\<You>\.ssh\oci_lepark.key`).
   * **Boot Volume:** Check **Specify a custom boot volume size** and set **50 GB** to **100 GB** (Always Free covers up to **200 GB total** across your account).
   * Click **Create**. Once the state turns **RUNNING**, note your **Public IPv4 Address**.

---

## Phase 2: Open Ports in the OCI Cloud Firewall (VCN)

OCI blocks all incoming web traffic by default until you allow it in your Virtual Cloud Network:

1. On your Instance details page, click the **Subnet** link under **Primary VNIC**.
2. Click the **Default Security List** (under **Security Lists**).
3. Click **Add Ingress Rules** and add the following rules:

| Source CIDR | IP Protocol | Destination Port Range | Purpose |
| :--- | :--- | :--- | :--- |
| `0.0.0.0/0` | TCP | `80` | HTTP (redirects to HTTPS + Certbot verification) |
| `0.0.0.0/0` | TCP | `443` | HTTPS & `wss://` WebSockets |

*(Port `22` for SSH is usually allowed by default; keep it open so you don't lock yourself out.)*

---

## Phase 3: Get a Free Domain (Required for HTTPS & Voice Mic)

Browsers require **HTTPS** for microphone access (`getUserMedia` in `VoiceManager.ts`) and secure WebSockets (`wss://`). If you don't own a custom domain, get a free subdomain:

1. Go to [duckdns.org](https://www.duckdns.org/) and sign in (free, no card).
2. Create a subdomain (e.g., `lepark-game` → `lepark-game.duckdns.org`).
3. Paste your **OCI Public IPv4 Address** into the IP box and click **update ip**.
4. Verify from your PC that `nslookup lepark-game.duckdns.org` returns your OCI IP.

---

## Phase 4: First-Time Server Setup via SSH

Connect from your Windows PowerShell terminal:

```powershell
ssh -i C:\Users\<You>\.ssh\oci_lepark.key ubuntu@YOUR_OCI_PUBLIC_IP
```

*(If Windows complains about private key permissions, right-click the `.key` file → Properties → Security → Advanced → Disable inheritance → Remove everyone except your own Windows user.)*

Once logged into Ubuntu, run the following steps:

### 4.1 Update System & Open Ubuntu Firewall
OCI's Ubuntu image includes restrictive `iptables` rules in addition to the VCN Security List:

```bash
sudo apt update && sudo apt upgrade -y

# Allow HTTP and HTTPS in Ubuntu's netfilter/iptables
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 80 -j ACCEPT
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 443 -j ACCEPT
sudo netfilter-persistent save
```

*(If `netfilter-persistent` isn't installed yet: `sudo apt install -y iptables-persistent && sudo netfilter-persistent save`.)*

### 4.2 Install Node.js 20, PM2, Nginx, Certbot & Docker

```bash
# 1. Node.js 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs git nginx certbot python3-certbot-nginx

# 2. PM2 (keeps Node.js running 24/7 and auto-restarts on crash/reboot)
sudo npm install -g pm2

# 3. Docker & Docker Compose plugin (for PostgreSQL)
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER
newgrp docker
```

Verify versions:
```bash
node -v && npm -v && docker --version && nginx -v
```

---

## Phase 5: Deploy Lepark & PostgreSQL

### 5.1 Clone Your Repository
```bash
cd ~
git clone https://github.com/YOUR_USERNAME/lepark.git
cd ~/lepark
```

### 5.2 Start PostgreSQL Safely (Localhost-Only)
Do **not** edit the tracked `docker-compose.yml` directly (so future `git pull` updates never hit merge conflicts). Instead, create a separate `docker-compose.prod.yml` in `~/lepark` (or copy it outside Git tracking):

```bash
cat << 'EOF' > ~/docker-compose.prod.yml
services:
  postgres:
    image: postgres:16-alpine
    container_name: game_postgres
    restart: unless-stopped
    environment:
      POSTGRES_USER: gameuser
      POSTGRES_PASSWORD: CHANGE_THIS_STRONG_PASSWORD
      POSTGRES_DB: gamedb
    ports:
      # Bind ONLY to 127.0.0.1 so Docker never exposes Postgres to the internet
      - "127.0.0.1:5433:5432"
    volumes:
      - game_pgdata:/var/lib/postgresql/data
      - /home/ubuntu/lepark/docker/init.sql:/docker-entrypoint-initdb.d/init.sql:ro
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U gameuser -d gamedb"]
      interval: 5s
      timeout: 5s
      retries: 5

volumes:
  game_pgdata:
EOF
```

Replace `CHANGE_THIS_STRONG_PASSWORD` with a real password, then start Postgres:

```bash
docker compose -f ~/docker-compose.prod.yml up -d
docker ps
```

*(Optional) If you want to migrate your existing local database data to OCI:*
1. On your Windows PC: `npm run db:export` (creates `db_backup.sql`).
2. Upload it: `scp -i C:\path\to\oci_lepark.key db_backup.sql ubuntu@YOUR_OCI_IP:~/lepark/db_backup.sql`
3. On OCI: `cd ~/lepark && npm run db:import`

### 5.3 Configure Free SMTP Email (for OTP Verification)
OCI blocks outbound port `25`, so use **port `587`** with a free SMTP provider that requires no credit card:
* **Brevo** (free 300 emails/day) or **Resend** (free 100 emails/day, 3,000/month).
* Grab your SMTP host, port (`587`), username, and password/API key.

### 5.4 Create Production Environment Files
1. **Backend (`~/lepark/server/.env`)**:

```bash
cat << 'EOF' > ~/lepark/server/.env
PORT=2567
CLIENT_URL=https://lepark-game.duckdns.org
SERVER_URL=https://lepark-game.duckdns.org

# Must be false because Nginx handles HTTPS/SSL termination
SERVER_HTTPS=false

# Strong random secret for JWT auth tokens (generate with: openssl rand -hex 32)
JWT_SECRET=REPLACE_WITH_LONG_RANDOM_SECRET

# PostgreSQL (matches ~/docker-compose.prod.yml)
DB_HOST=127.0.0.1
DB_PORT=5433
DB_USER=gameuser
DB_PASSWORD=CHANGE_THIS_STRONG_PASSWORD
DB_NAME=gamedb

# Free SMTP (example: Brevo)
SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_USER=your_smtp_login
SMTP_PASS=your_smtp_key
SMTP_FROM=Lepark <your_verified_sender@example.com>
EOF
```

2. **Frontend (`~/lepark/client/.env`)**:
Leave `VITE_SERVER_URL` **empty/unset** so `client/src/main.ts` and `client/src/network/MultiplayerManager.ts` automatically use same-origin `/api` and `wss://lepark-game.duckdns.org/colyseus` through Nginx:

```bash
cat << 'EOF' > ~/lepark/client/.env
VITE_HTTPS=false
EOF
```

### 5.5 Install Dependencies, Build, and Start with PM2

```bash
cd ~/lepark
npm install
npm run build

# Start the server via PM2
pm2 start server/dist/index.js --name lepark

# Save process list & auto-start on VM reboot
pm2 save
pm2 startup
```

> **Note:** `pm2 startup` will print a `sudo env PATH=...` command—copy and run that command once so PM2 automatically starts after any server reboot.

Verify the backend is healthy locally:
```bash
curl http://127.0.0.1:2567/health
```
You should see `"status":"ok"` and `"database":"connected"`.

---

## Phase 6: Configure Nginx & Free HTTPS (Certbot)

Create `/etc/nginx/sites-available/lepark` based on your repo's `nginx.conf` (using **Option B** to serve `client/dist` directly):

```bash
sudo tee /etc/nginx/sites-available/lepark > /dev/null << 'EOF'
server {
    listen 80;
    server_name lepark-game.duckdns.org;

    # Backend REST API & Matchmaking -> Port 2567
    location ~ ^/(api|health|matchmake)/ {
        proxy_pass http://127.0.0.1:2567;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        client_max_body_size 10M;
    }

    # Colyseus WebSocket Connection -> Port 2567
    location /colyseus/ {
        proxy_pass http://127.0.0.1:2567/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 86400s;
        proxy_send_timeout 86400s;
    }

    # Static Frontend (Vite Build)
    location / {
        root /home/ubuntu/lepark/client/dist;
        index index.html;
        try_files $uri $uri/ /index.html;
    }
}
EOF
```

Enable the site, remove the default Nginx site, test config, and obtain your free SSL certificate:

```bash
sudo rm -f /etc/nginx/sites-enabled/default
sudo ln -sf /etc/nginx/sites-available/lepark /etc/nginx/sites-enabled/lepark
sudo nginx -t
sudo systemctl reload nginx

# Issue free Let's Encrypt HTTPS certificate & auto-configure SSL redirect
sudo certbot --nginx -d lepark-game.duckdns.org
```

*(Certbot automatically installs a systemd timer to renew the SSL certificate every 60–90 days for free.)*

Open `https://lepark-game.duckdns.org` in your browser to test!

---

## Phase 7: (Optional) Free WebRTC TURN Server for Voice Chat

Currently `client/src/network/VoiceManager.ts` uses free public STUN servers (`stun.l.google.com`, `stun.cloudflare.com`). Most players can talk fine over STUN, **except** players on strict mobile hotspots or university/office Wi-Fi.

Two \$0 ways to add TURN fallback:
1. **Easiest:** Sign up for **Metered.ca** free tier / Open Relay and add its `turn:` credentials to `rtcConfig.iceServers` in `client/src/network/VoiceManager.ts`.
2. **Self-hosted on OCI:** Install `coturn` (`sudo apt install -y coturn`) on your OCI VM and open UDP/TCP `3478` + `5349` + UDP relay range (e.g., `49152-49252`) in both OCI VCN Security Lists and `iptables`.

---

## Phase 8: How to Push Future Code Updates to OCI

### 8.1 Create `~/deploy.sh` on the OCI VM
Keep `deploy.sh` in `/home/ubuntu/` (outside the git repo) so it never interferes with `git pull`:

```bash
cat << 'EOF' > ~/deploy.sh
#!/bin/bash
set -e

cd /home/ubuntu/lepark

echo "📥 Pulling latest changes..."
git pull origin main

echo "📦 Installing dependencies..."
npm install

echo "🔨 Building shared, server, and client..."
npm run build

echo "🚀 Restarting backend..."
pm2 restart lepark

echo "✅ Update deployed!"
EOF

chmod +x ~/deploy.sh
```

### 8.2 Deploy from Your Windows PC (One Command)
After `git push origin main` on your PC:

```powershell
ssh -i C:\Users\<You>\.ssh\oci_lepark.key ubuntu@YOUR_OCI_PUBLIC_IP "~/deploy.sh"
```

### 8.3 (Optional) Auto-Deploy on Every `git push` via GitHub Actions
1. In GitHub → **Repo Settings → Secrets and variables → Actions**, add:
   * `OCI_HOST`: Your OCI Public IPv4
   * `OCI_USER`: `ubuntu`
   * `OCI_SSH_KEY`: Full text of your private `.key` file
2. Create `.github/workflows/deploy.yml` in your project:

```yaml
name: Deploy to OCI

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Run deploy script on OCI
        uses: appleboy/ssh-action@v1.0.3
        with:
          host: ${{ secrets.OCI_HOST }}
          username: ${{ secrets.OCI_USER }}
          key: ${{ secrets.OCI_SSH_KEY }}
          script: /home/ubuntu/deploy.sh
```

---

## Phase 9: Maintenance, Backups & OCI Free-Tier Rules

### Daily Automated PostgreSQL Backups (Free, Local on Boot Volume)
Add a daily 3:00 AM cron job keeping the last 7 days of backups:

```bash
mkdir -p ~/backups
(crontab -l 2>/dev/null; echo "0 3 * * * docker exec game_postgres pg_dump -U gameuser gamedb | gzip > /home/ubuntu/backups/lepark_\$(date +\%F).sql.gz && find /home/ubuntu/backups -type f -mtime +7 -delete") | crontab -
```

### Useful Commands on OCI
* **View live server logs:** `pm2 logs lepark`
* **Check server status / RAM:** `pm2 status` and `free -h`
* **Check Postgres logs:** `docker logs -f game_postgres`
* **Reload Nginx after config edits:** `sudo nginx -t && sudo systemctl reload nginx`

### Important OCI "Always Free" Gotchas
1. **7-Day Idle Reclamation:** Oracle may stop or reclaim Always Free instances if CPU, memory, and network utilization all stay near 0% for 7 consecutive days. Having PostgreSQL + Node.js running (plus occasional player visits or daily backup cron) normally keeps activity above threshold, and you can also check `pm2 status` occasionally.
2. **Active Players During Updates:** `pm2 restart lepark` disconnects active WebSocket players for ~1–2 seconds and clears in-memory Focus/Squad sessions and pending OTP codes (all PostgreSQL data remains intact, and `initDb()` automatically applies `CREATE TABLE IF NOT EXISTS` / `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` migrations on boot).
3. **Never Expose Port `2567` or `5433` Publicly:** Let Nginx handle external `80`/`443` traffic and keep Node (`2567`) and Postgres (`5433`) behind `127.0.0.1` / VCN firewall.
