# Deploying Lepark to Oracle Cloud Infrastructure (OCI) — Always Free Tier Guide

This guide walks you through hosting **Lepark** (Phaser 3 client, Colyseus + Express Node.js server, and PostgreSQL 16 database) on **Oracle Cloud Infrastructure (OCI)** using the **Always Free** tier—starting from creating your OCI account all the way to a live HTTPS/WSS production deployment with automated backups.

---

## Table of Contents

1. [Architecture & Always Free Resources](#1-architecture--always-free-resources)
2. [Step 1: Create an OCI Free Tier Account](#2-step-1-create-an-oci-free-tier-account)
3. [Step 2: Create an Always Free Compute Instance](#3-step-2-create-an-always-free-compute-instance)
4. [Step 3: Reserve a Static Public IP & Open OCI Firewall Ports](#4-step-3-reserve-a-static-public-ip--open-oci-firewall-ports)
5. [Step 4: Connect via SSH & Configure the OS](#5-step-4-connect-via-ssh--configure-the-os)
6. [Step 5: Install Runtime Dependencies (Node.js, Docker, Nginx, PM2)](#6-step-5-install-runtime-dependencies-nodejs-docker-nginx-pm2)
7. [Step 6: Upload/Clone the Code & Configure Production `.env`](#7-step-6-uploadclone-the-code--configure-production-env)
8. [Step 7: Start PostgreSQL & Restore Database](#8-step-7-start-postgresql--restore-database)
9. [Step 8: Build the Project & Run the Server with PM2](#9-step-8-build-the-project--run-the-server-with-pm2)
10. [Step 9: Configure DNS, Nginx Reverse Proxy & Free HTTPS (Certbot)](#10-step-9-configure-dns-nginx-reverse-proxy--free-https-certbot)
11. [Step 10: Verify Your Deployment](#11-step-10-verify-your-deployment)
12. [Step 11: Updates, Backups & Always Free Maintenance](#12-step-11-updates-backups--always-free-maintenance)
13. [Troubleshooting](#13-troubleshooting)

---

## 1. Architecture & Always Free Resources

### How Lepark Runs on OCI

All components run cleanly on a **single OCI Always Free VM**:

```text
Internet (HTTPS :443 / WSS :443)
        │
        ▼
┌───────────────────────────────────────────────────────┐
│  OCI Compute VM (Ubuntu 24.04 ARM64 — VM.Standard.A1) │
│                                                       │
│  ┌─────────────────────────────────────────────────┐  │
│  │ Nginx (Ports 80 / 443 with Let's Encrypt SSL)   │  │
│  │  • /                -> client/dist (static SPA) │  │
│  │  • /api, /health,                               │  │
│  │    /matchmake       -> http://127.0.0.1:2567    │  │
│  │  • /colyseus/ (WS)  -> http://127.0.0.1:2567/   │  │
│  └──────────────────────────┬──────────────────────┘  │
│                             ▼                         │
│  ┌─────────────────────────────────────────────────┐  │
│  │ Node.js + Colyseus Server (PM2, Port 2567 HTTP) │  │
│  └──────────────────────────┬──────────────────────┘  │
│                             ▼                         │
│  ┌─────────────────────────────────────────────────┐  │
│  │ PostgreSQL 16 (Docker, 127.0.0.1:5433 -> 5432)  │  │
│  └─────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────┘
```

### OCI Always Free Tier Limits Used

| Resource | Always Free Allowance | What We Will Use |
| :--- | :--- | :--- |
| **ARM Compute (`VM.Standard.A1.Flex`)** | Up to **4 OCPUs** & **24 GB RAM** total | 2 OCPUs / 12 GB RAM (or 4 OCPUs / 24 GB RAM) |
| **Block Volume Storage** | Up to **200 GB** total (min 47 GB per boot volume) | 50–100 GB Boot Volume |
| **Outbound Data Transfer** | **10 TB / month** | Plenty for real-time multiplayer + static assets |
| **Virtual Cloud Network (VCN)** | Included | 1 VCN + 1 Reserved Public IP |

> **Why `VM.Standard.A1.Flex` (ARM64) instead of `VM.Standard.E2.1.Micro` (x86)?**
> `E2.1.Micro` only has 1 GB RAM, which is very tight for running PostgreSQL, Node.js/Colyseus, and Vite TypeScript builds simultaneously. `VM.Standard.A1.Flex` gives you up to 4 OCPUs and 24 GB RAM for free, and Node.js, PostgreSQL (`postgres:16-alpine`), Docker, and Nginx all have official native ARM64 (`aarch64`) support.

---

## 2. Step 1: Create an OCI Free Tier Account

1. Go to [https://www.oracle.com/cloud/free/](https://www.oracle.com/cloud/free/) and click **Start for free**.
2. Enter your **Country/Territory**, **Name**, and **Email Address**, then verify your email.
3. Set your **Password**, **Account Type** (`Individual`), and **Cloud Account Name** (e.g., `leparkcloud`).
4. **Choose your Home Region carefully** — **this cannot be changed later** and your Always Free resources must be created in your Home Region.
   - Pick the region closest to your players (for example, **Singapore (`ap-singapore-1`)** for Malaysia/SEA, **Tokyo**, **Frankfurt**, or **US East/West**).
5. Enter your **Address** and **Phone Number** for verification.
6. **Payment Verification**:
   - OCI requires a valid credit/debit card for identity verification. A temporary small authorization hold (~$1 USD) is placed and refunded.
   - **You will NOT be charged** as long as you only use **Always Free-eligible** resources (clearly labeled with an `Always Free-eligible` badge in the console) and do not exceed the Always Free limits after the 30-day free trial ends.
7. Accept the agreement and click **Start my free trial**. Wait 2–5 minutes for your tenancy to be provisioned, then sign in to the **OCI Console**.

---

## 3. Step 2: Create an Always Free Compute Instance

1. In the OCI Console, open the top-left **Navigation Menu (☰)** → **Compute** → **Instances**.
2. Make sure you are in the **root** compartment (or your chosen compartment) and click **Create instance**.
3. Configure the instance settings:
   - **Name**: `lepark-server`
   - **Placement**: Leave the default Availability Domain (AD-1). If you later get an "Out of host capacity" error, try AD-2 or AD-3.
   - **Image and shape**: Click **Edit**:
     - **Image**: Click **Change image** → select **Canonical Ubuntu** → **24.04** (or **24.04 Minimal**) → click **Select image**.
     - **Shape**: Click **Change shape** → select **Ampere** → check **`VM.Standard.A1.Flex`** (`Always Free-eligible`).
       - Set **OCPUs**: `2` (or up to `4`).
       - Set **Memory (GB)**: `12` (or up to `24`).
       - Click **Select shape**.
   - **Networking**:
     - Leave **Create new virtual cloud network** and **Create new public subnet** selected (unless you already have a VCN).
     - Ensure **Assign a public IPv4 address** is **checked**.
   - **Add SSH keys**:
     - Select **Generate a key pair for me**.
     - Click **Save private key** (downloads `ssh-key-YYYY-MM-DD.key`) and **Save public key**.
     - **Keep the private key safe!** You cannot download it again.
   - **Boot volume**:
     - Optionally check **Specify a custom boot volume size** and set it to `100` GB (still well within your 200 GB Always Free limit, leaving room for Docker images, game assets, and DB backups).
4. Click **Create**. Wait 1–2 minutes until the instance status turns green (**Running**) and note its **Public IP address**.

> **Handling "Out of host capacity" for `VM.Standard.A1.Flex`:**
> Free Tier ARM capacity in popular regions (like Singapore) can occasionally be full. You have three options:
> 1. Try creating the instance in a different **Availability Domain** (AD-1 / AD-2 / AD-3) or with `2 OCPUs / 12 GB` instead of `4 / 24`.
> 2. **Recommended long-term fix**: Upgrade your account to **Pay-As-You-Go (PAYG)** in **Billing & Cost Management → Upgrade and Manage Payment**. PAYG accounts get priority ARM capacity, **still receive the exact same Always Free resources for $0/month**, and are **exempt from idle instance reclamation**. Just set a **$1 Budget Alert** under *Billing & Cost Management → Budgets* for peace of mind.
> 3. Temporarily use `VM.Standard.E2.1.Micro` (1 GB RAM x86) with a 2 GB swap file until ARM capacity opens up.

---

## 4. Step 3: Reserve a Static Public IP & Open OCI Firewall Ports

### 4.1 Assign a Reserved Public IP (Prevents IP Changes on Reboot)

By default, OCI assigns an *Ephemeral* IP that can change if the instance is stopped/restarted. A **Reserved Public IP** is free while attached to a running instance.

1. Go to **Networking** → **IP management** → **Reserved public IPs** → click **Reserve public IP address**.
2. Name it `lepark-ip` and click **Reserve public IP address**.
3. Go back to **Compute** → **Instances** → click `lepark-server`.
4. Under **Resources** (bottom-left), click **Attached VNICs** → click the primary VNIC name.
5. Under **Resources**, click **IPv4 Addresses** → click the `⋮` menu on the right of the primary IP → **Edit**.
6. Change **Public IP Type** from *Ephemeral public IP* to **No public IP** → click **Update**.
7. Click `⋮` → **Edit** again → select **Reserved public IP** → choose `lepark-ip` → click **Update**.

Your server now has a permanent Public IPv4 address (`<YOUR_OCI_IP>`).

### 4.2 Open Ports 80 and 443 in the OCI VCN Security List

OCI blocks all inbound traffic except SSH (port 22) by default.

1. On your instance details page, click the **Subnet** link (e.g., `subnet-xxxx`).
2. Under **Security Lists**, click **Default Security List for vcn-xxxx**.
3. Click **Add Ingress Rules** and add the following two rules:

| Source CIDR | IP Protocol | Destination Port Range | Description |
| :--- | :--- | :--- | :--- |
| `0.0.0.0/0` | TCP | `80` | HTTP (Certbot + HTTPS redirect) |
| `0.0.0.0/0` | TCP | `443` | HTTPS + WSS (Nginx reverse proxy) |

4. Click **Add Ingress Rules** to save.

> **Security Note:** Do **NOT** open ports `2567` or `5433` to `0.0.0.0/0`. Nginx will proxy all public traffic safely over port `443` to localhost `2567`, and PostgreSQL should only ever be reachable locally on `127.0.0.1:5433`.

---

## 5. Step 4: Connect via SSH & Configure the OS

### 5.1 SSH into Your OCI Instance

From your local computer (macOS/Linux terminal):

```bash
# Move the downloaded private key to ~/.ssh and restrict permissions
mv ~/Downloads/ssh-key-*.key ~/.ssh/oci_lepark.key
chmod 400 ~/.ssh/oci_lepark.key

# Connect (default username on OCI Ubuntu images is "ubuntu")
ssh -i ~/.ssh/oci_lepark.key ubuntu@<YOUR_OCI_IP>
```

### 5.2 Update the System

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl git build-essential ca-certificates gnupg
```

### 5.3 Open Ports 80 and 443 in Ubuntu's `iptables` Firewall (CRITICAL OCI STEP)

> **Important OCI Gotcha:** OCI Ubuntu images ship with strict `iptables` rules that reject incoming traffic on ports 80 and 443 *even after* you open them in the OCI VCN Security List.

Run the following commands on the server to allow HTTP/HTTPS and persist the rules across reboots:

```bash
# Insert ACCEPT rules for ports 80 and 443 before the REJECT rule
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 80 -j ACCEPT
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 443 -j ACCEPT

# Save rules so they survive reboots
sudo netfilter-persistent save
```

*(If `netfilter-persistent` is not installed, run `sudo apt install -y iptables-persistent` first, then `sudo netfilter-persistent save`.)*

---

## 6. Step 5: Install Runtime Dependencies (Node.js, Docker, Nginx, PM2)

Run these commands on your OCI server:

### 6.1 Install Node.js 20 LTS

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Verify versions
node -v   # Should be v20.x.x
npm -v
```

### 6.2 Install PM2 (Process Manager for the Game Server)

```bash
sudo npm install -g pm2
```

### 6.3 Install Docker & Docker Compose (for PostgreSQL 16)

```bash
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER

# Apply group membership (or log out and SSH back in)
newgrp docker

# Verify Docker & Docker Compose plugin
docker --version
docker compose version
```

### 6.4 Install Nginx & Certbot (for Reverse Proxy & Free SSL)

```bash
sudo apt install -y nginx certbot python3-certbot-nginx
sudo systemctl enable nginx
sudo systemctl start nginx
```

---

## 7. Step 6: Upload/Clone the Code & Configure Production `.env`

### 7.1 Get the Lepark Code onto the Server

Choose **Option A (Git)** if your repo is on GitHub/GitLab, or **Option B (`rsync`)** to upload directly from your Mac.

**Option A: Clone via Git (run on OCI server)**
```bash
sudo mkdir -p /var/www/lepark
sudo chown -R $USER:$USER /var/www/lepark
git clone <YOUR_GIT_REPO_URL> /var/www/lepark
cd /var/www/lepark
```

**Option B: Upload directly from your local machine (run on your Mac)**
```bash
# First, create the directory on the server:
ssh -i ~/.ssh/oci_lepark.key ubuntu@<YOUR_OCI_IP> "sudo mkdir -p /var/www/lepark && sudo chown -R ubuntu:ubuntu /var/www/lepark"

# Sync the project (excluding local node_modules, build outputs, certs, and .env)
rsync -avz --progress \
  -e "ssh -i ~/.ssh/oci_lepark.key" \
  --exclude 'node_modules' \
  --exclude 'client/node_modules' \
  --exclude 'client/dist' \
  --exclude 'server/dist' \
  --exclude 'shared/dist' \
  --exclude '.git' \
  --exclude '.env' \
  --exclude 'certs' \
  --exclude 'client/certs' \
  --exclude 'itch_io' \
  --exclude '.DS_Store' \
  /Users/firdausfadzi/Desktop/game/ \
  ubuntu@<YOUR_OCI_IP>:/var/www/lepark/
```

### 7.2 Create the Production `.env` File

On your OCI server, create `/var/www/lepark/.env`:

```bash
cd /var/www/lepark
nano .env
```

Paste and customize the following values (generate a strong random `JWT_SECRET` using `openssl rand -hex 32`):

```env
# ==========================================
# Production Server & Client Settings
# ==========================================
PORT=2567

# IMPORTANT: Set SERVER_HTTPS=false because Nginx handles HTTPS/SSL termination on port 443.
SERVER_HTTPS=false
VITE_HTTPS=false

# IMPORTANT: Leave VITE_SERVER_URL empty for same-origin production routing!
# When empty, the client automatically routes:
#   • REST API  -> https://yourdomain.com/api/*
#   • WebSocket -> wss://yourdomain.com/colyseus
VITE_SERVER_URL=

SERVER_URL=https://yourdomain.com
CLIENT_URL=https://yourdomain.com

# ==========================================
# Security (REQUIRED: change these!)
# ==========================================
# Generate with: openssl rand -hex 32
JWT_SECRET=REPLACE_WITH_A_LONG_RANDOM_SECRET_KEY

# ==========================================
# PostgreSQL Database
# ==========================================
DB_HOST=127.0.0.1
DB_PORT=5433
DB_USER=gameuser
DB_PASSWORD=REPLACE_WITH_STRONG_DB_PASSWORD
DB_NAME=gamedb

# ==========================================
# Email / OTP Service (Optional — required for email registration & password reset)
# NOTE: OCI blocks outbound port 25. Always use port 587 (STARTTLS) or 465 (SMTPS).
# ==========================================
SMTP_HOST=smtp.mailgun.org
SMTP_PORT=587
SMTP_USER=postmaster@yourdomain.com
SMTP_PASS=your_smtp_password
SMTP_FROM=Lepark <support@yourdomain.com>

# ==========================================
# Optional Integrations
# ==========================================
# YOUTUBE_API_KEY=your_youtube_data_api_v3_key
# ONLINE_POINT_INTERVAL_MS=600000
```

Save and exit (`Ctrl+O`, `Enter`, `Ctrl+X`), then lock down `.env` permissions:

```bash
chmod 600 /var/www/lepark/.env
```

---

## 8. Step 7: Start PostgreSQL & Restore Database

### 8.1 Harden `docker-compose.yml` for Production

Edit `/var/www/lepark/docker-compose.yml` so that:
1. PostgreSQL binds **only** to `127.0.0.1:5433:5432` (so it is never exposed to the public internet).
2. `POSTGRES_PASSWORD` matches your strong `DB_PASSWORD` from `.env`.

```bash
nano /var/www/lepark/docker-compose.yml
```

Update the `environment` and `ports` sections:

```yaml
services:
  postgres:
    image: postgres:16-alpine
    container_name: game_postgres
    restart: unless-stopped
    environment:
      POSTGRES_USER: ${DB_USER:-gameuser}
      POSTGRES_PASSWORD: ${DB_PASSWORD:-gamepassword}
      POSTGRES_DB: ${DB_NAME:-gamedb}
    ports:
      # Bind to localhost ONLY for security
      - "127.0.0.1:5433:5432"
    volumes:
      - game_pgdata:/var/lib/postgresql/data
      - ./docker/init.sql:/docker-entrypoint-initdb.d/init.sql:ro
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USER:-gameuser} -d ${DB_NAME:-gamedb}"]
      interval: 5s
      timeout: 5s
      retries: 5

volumes:
  game_pgdata:
```

### 8.2 Start PostgreSQL

```bash
cd /var/www/lepark
npm run db:up

# Verify it is healthy
docker ps
```

### 8.3 (Optional) Import Your Existing `db_backup.sql`

If you want to migrate your existing users, spaces, and chat data from your local machine:

1. On your local machine, export the latest backup if needed:
   ```bash
   npm run db:export
   ```
2. Copy `db_backup.sql` to `/var/www/lepark/db_backup.sql` (already included if you used `rsync` above).
3. On the OCI server, run:
   ```bash
   cd /var/www/lepark
   npm run db:import
   ```

---

## 9. Step 8: Build the Project & Run the Server with PM2

### 9.1 Install Dependencies & Build All Workspaces

```bash
cd /var/www/lepark

# Install dependencies for shared, server, and client workspaces
npm install

# Build shared -> server -> client (creates client/dist and server/dist)
npm run build
```

Verify that both build outputs exist:
- `/var/www/lepark/server/dist/index.js`
- `/var/www/lepark/client/dist/index.html`

### 9.2 Start the Colyseus Game Server with PM2

```bash
cd /var/www/lepark
pm2 start server/dist/index.js --name lepark-server --cwd /var/www/lepark
```

Check that the server started cleanly and connected to PostgreSQL:

```bash
pm2 logs lepark-server --lines 30
curl http://127.0.0.1:2567/health
```

You should see a JSON response with `"status":"ok"` and `"database":"connected"`.

### 9.3 Enable Auto-Start on Server Reboot

```bash
# Save current PM2 process list
pm2 save

# Generate and install the systemd startup hook
pm2 startup
```

> **Note:** `pm2 startup` will print a `sudo env PATH=...` command. **Copy and run that printed command** to complete setup, then run `pm2 save` once more.

---

## 10. Step 9: Configure DNS, Nginx Reverse Proxy & Free HTTPS (Certbot)

### 10.1 Point Your Domain to Your OCI IP

At your domain registrar or DNS provider (Cloudflare, Namecheap, Porkbun, DuckDNS, etc.), create an **`A` record**:

| Type | Name / Host | Value / Target | TTL |
| :--- | :--- | :--- | :--- |
| `A` | `@` (or subdomain like `play`) | `<YOUR_OCI_IP>` | Auto / 300 |

> **Using Cloudflare?** Set the proxy status to **DNS Only (grey cloud)** while issuing the Let's Encrypt certificate with Certbot. You can re-enable orange cloud later if desired (ensure SSL/TLS mode is set to **Full (strict)** and WebSockets are enabled in Cloudflare Network settings).

> **Don't have a domain yet?** You can get a free subdomain from [DuckDNS](https://www.duckdns.org/) (e.g., `lepark.duckdns.org`) and point it to `<YOUR_OCI_IP>` so you still get valid HTTPS/WSS.

Wait 1–5 minutes and verify DNS propagation from your OCI server:

```bash
dig +short yourdomain.com
# Should output <YOUR_OCI_IP>
```

### 10.2 Configure Nginx

Create an Nginx site configuration for Lepark (replace `yourdomain.com` with your actual domain):

```bash
sudo nano /etc/nginx/sites-available/lepark
```

Paste the following production configuration:

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name yourdomain.com;

    # Allow custom sprite & asset uploads (matches Express 8MB JSON limit)
    client_max_body_size 10M;

    # Security / Media Permissions headers
    add_header Permissions-Policy "compute-pressure=*, encrypted-media=*, autoplay=*, camera=*, microphone=*" always;

    # ==========================================
    # Backend REST API & Matchmaking -> Port 2567
    # ==========================================
    location ~ ^/(api|health|matchmake)/ {
        proxy_pass http://127.0.0.1:2567;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Exact /health match
    location = /health {
        proxy_pass http://127.0.0.1:2567/health;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # ==========================================
    # Colyseus WebSocket Connection -> Port 2567
    # ==========================================
    location /colyseus/ {
        proxy_pass http://127.0.0.1:2567/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 86400s; # Prevent idle WebSocket disconnects
        proxy_send_timeout 86400s;
    }

    # ==========================================
    # Frontend Static SPA (Vite Production Build)
    # ==========================================
    location / {
        root /var/www/lepark/client/dist;
        index index.html;
        try_files $uri $uri/ /index.html;
    }

    # Cache static hashed JS/CSS/image assets aggressively
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|webp|woff2|mp3|ogg|wav)$ {
        root /var/www/lepark/client/dist;
        expires 7d;
        add_header Cache-Control "public, no-transform";
    }
}
```

Enable the site, remove the default site, and test Nginx:

```bash
sudo ln -sf /etc/nginx/sites-available/lepark /etc/nginx/sites-enabled/lepark
sudo rm -f /etc/nginx/sites-enabled/default

# Ensure Nginx (www-data) can traverse /var/www/lepark/client/dist
sudo chmod -R o+rX /var/www/lepark/client/dist

sudo nginx -t
sudo systemctl reload nginx
```

### 10.3 Issue a Free Let's Encrypt SSL Certificate (HTTPS + WSS)

Run Certbot to automatically obtain a certificate and configure HTTPS redirect in Nginx:

```bash
sudo certbot --nginx -d yourdomain.com
```

Follow the prompts (enter your email, agree to terms). Certbot will automatically update `/etc/nginx/sites-available/lepark` to listen on port `443 ssl` and redirect HTTP (`80`) to HTTPS (`443`).

Test automatic certificate renewal:

```bash
sudo certbot renew --dry-run
```

---

## 11. Step 10: Verify Your Deployment

1. **Health Endpoint**:
   Open `https://yourdomain.com/health` in your browser (or run `curl https://yourdomain.com/health`).
   Expected output:
   ```json
   {"status":"ok","database":"connected","timestamp":"..."}
   ```
2. **Frontend & Multiplayer**:
   - Open `https://yourdomain.com` in your browser.
   - Open browser DevTools (**Console** and **Network → WS** tab).
   - Confirm you see `[MultiplayerManager] Connecting Colyseus client to wss://yourdomain.com/colyseus` with a `101 Switching Protocols` WebSocket connection.
3. **Authentication & Persistence**:
   - Sign in (or register a test account), move around / edit a space, refresh the page, and confirm data persists in PostgreSQL.

---

## 12. Step 11: Updates, Backups & Always Free Maintenance

### 12.1 Deploying Future Code Updates

When you push new changes (via `git` or `rsync`), run this on your OCI server:

```bash
cd /var/www/lepark
git pull                 # (or rsync from your local machine)
npm install              # only needed if package.json changed
npm run build            # rebuilds shared, server, and client/dist
pm2 restart lepark-server
```

Nginx immediately serves the updated files in `client/dist` with no Nginx restart required.

### 12.2 Automated Daily PostgreSQL Backups

Set up a daily cron job to export your database and keep the last 7 days of backups:

```bash
mkdir -p /home/ubuntu/backups
crontab -e
```

Add this line (runs every day at 3:00 AM server time):

```cron
0 3 * * * docker exec game_postgres pg_dump -U gameuser -d gamedb --clean --if-exists --no-owner --no-privileges | gzip > /home/ubuntu/backups/gamedb_$(date +\%F).sql.gz && find /home/ubuntu/backups -type f -name "*.sql.gz" -mtime +7 -delete
```

### 12.3 Avoiding OCI Always Free "Idle Instance Reclamation"

On standard Free Tier accounts (not upgraded to Pay-As-You-Go), Oracle may reclaim an Always Free compute instance if **all** of the following are true over a 7-day period:
- CPU utilization (95th percentile) is `< 20%`
- Network utilization is `< 20%`
- Memory utilization is `< 20%` *(applies to A1.Flex shapes)*

**How to prevent reclamation:**
- **Best option**: Upgrade your account to **Pay-As-You-Go (PAYG)** while keeping your usage strictly within Always Free limits (4 OCPUs / 24 GB RAM / 200 GB storage). PAYG accounts are **not** subject to idle reclamation and still cost **$0/month** for Always Free resources.
- **Alternative**: Keep your A1.Flex instance right-sized (e.g., 1 OCPU / 6 GB RAM instead of 4 OCPUs / 24 GB RAM) so normal PostgreSQL + Node.js memory usage stays above 20% naturally.

---

## 13. Troubleshooting

| Symptom | Likely Cause | Fix |
| :--- | :--- | :--- |
| **Site times out (cannot connect to port 80/443)** | OCI VCN Security List **or** Ubuntu `iptables` is blocking traffic | Verify both [Step 3.2](#42-open-ports-80-and-443-in-the-oci-vcn-security-list) and [Step 4.3](#53-open-ports-80-and-443-in-ubuntus-iptables-firewall-critical-oci-step). Run `sudo iptables -L INPUT -n --line-numbers` to verify `ACCEPT` rules for `80` and `443` appear *before* any `REJECT` rule. |
| **502 Bad Gateway on `/api` or `/colyseus`** | `lepark-server` is not running, or `SERVER_HTTPS=true` was left in `.env` | Check `pm2 status` and `pm2 logs lepark-server`. Ensure `SERVER_HTTPS=false` in `.env` because Nginx proxies to `http://127.0.0.1:2567`. |
| **Client tries to connect to `:2567` or `lan.jomlepark.cc`** | `VITE_SERVER_URL` was set when `npm run build` ran | Set `VITE_SERVER_URL=` (empty) in `.env` and re-run `npm run build`. |
| **413 Request Entity Too Large on sprite upload** | Nginx default upload limit is 1 MB | Ensure `client_max_body_size 10M;` is present in `/etc/nginx/sites-available/lepark` and run `sudo systemctl reload nginx`. |
| **Database shows `disconnected (fallback mode)`** | PostgreSQL container is stopped or `DB_PASSWORD` mismatch | Run `docker ps` and `docker compose logs postgres`. Ensure `DB_PASSWORD` in `.env` matches `POSTGRES_PASSWORD` in `docker-compose.yml`. |
| **OTP emails not sending** | Missing SMTP credentials or using blocked port 25 | Configure `SMTP_HOST`, `SMTP_PORT=587`, `SMTP_USER`, `SMTP_PASS`, and `SMTP_FROM` in `.env`, then run `pm2 restart lepark-server`. |
| **WebSocket disconnects after 60 seconds** | Missing `proxy_read_timeout` in Nginx | Ensure `proxy_read_timeout 86400s;` and `proxy_send_timeout 86400s;` are inside the `location /colyseus/` block. |
