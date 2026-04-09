#!/bin/bash
# ============================================================
#  Diet Diary — EC2 User Data Bootstrap Script
# ============================================================
#  Paste this into "Advanced Details → User data" when
#  launching your EC2 instance. It will:
#    1. Install Node.js 20 LTS
#    2. Clone your repo from GitHub
#    3. Install dependencies
#    4. Start the server with PM2
#
#  BEFORE RUNNING: Update the variables below!
# ============================================================

set -euo pipefail
exec > /var/log/dietdiary-setup.log 2>&1

# ── EDIT THESE ────────────────────────────────────────────────
GITHUB_REPO="https://github.com/YOUR_USERNAME/Diet-diary-aws.git"
# If your repo is private, use a PAT:
# GITHUB_REPO="https://YOUR_PAT@github.com/YOUR_USERNAME/Diet-diary-aws.git"

# ── Install Dependencies ─────────────────────────────────────
echo "📦 Installing system dependencies..."
dnf update -y
dnf install -y git
curl -fsSL https://rpm.nodesource.com/setup_20.x | bash -
dnf install -y nodejs

echo "Node version: $(node -v)"
echo "NPM version:  $(npm -v)"

# ── Clone Project ────────────────────────────────────────────
APP_DIR="/home/ec2-user/diet-diary"
echo "📥 Cloning repository..."
git clone "$GITHUB_REPO" "$APP_DIR" || {
    echo "⚠️  Clone failed — repo may already exist"
    cd "$APP_DIR" && git pull || true
}

cd "$APP_DIR"

# ── Install Node Dependencies ────────────────────────────────
echo "📦 Installing npm packages..."
npm install --production

# ── Install PM2 for process management ───────────────────────
echo "🔄 Installing PM2..."
npm install -g pm2

# ── Set environment variables from instance metadata ─────────
# The LabInstanceProfile provides AWS credentials automatically
# via the EC2 Instance Metadata Service — no need to set keys!
cat > /home/ec2-user/diet-diary/.env << 'ENVEOF'
# AWS region (the credentials come from LabInstanceProfile auto)
AWS_REGION=us-east-1
NODE_ENV=production
PORT=3000

# These will be loaded from Secrets Manager at startup
AWS_SECRET_NAME=DietDiary/Prod
ENVEOF

# ── Initialize Database Tables ───────────────────────────────
echo "🏗️ Initializing database tables..."
node scripts/setup-all-services.js || {
    echo "⚠️  Full setup may have partial failures — check logs"
}

# ── Start Application ────────────────────────────────────────
echo "🚀 Starting Diet Diary with PM2..."
pm2 start server.js --name "dietdiary" --env production
pm2 save
pm2 startup systemd -u ec2-user --hp /home/ec2-user

# ── Fix permissions ──────────────────────────────────────────
chown -R ec2-user:ec2-user "$APP_DIR"

echo ""
echo "════════════════════════════════════════════════════"
echo "  🎉  Diet Diary is LIVE on port 3000!"
echo "  Access: http://$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4):3000"
echo "════════════════════════════════════════════════════"
