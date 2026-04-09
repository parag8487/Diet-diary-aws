#!/bin/bash
echo "🚀 Starting Deployment..."
set -e

# Install Node.js
if ! command -v node &> /dev/null; then
    echo "📦 Installing Node.js..."
    curl -sL https://rpm.nodesource.com/setup_20.x | sudo bash -
    sudo dnf install -y nodejs unzip
fi

# Prepare App Directory
sudo mkdir -p /home/ec2-user/app
sudo chown ec2-user:ec2-user /home/ec2-user/app
cd /home/ec2-user/app

# Download from S3
echo "📥 Downloading code from S3..."
aws s3 cp s3://dietdiary-502951073560-images/deployment.zip .
unzip -o deployment.zip
rm deployment.zip

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Kill existing process if running
pkill node || true

# Start App
echo "🔥 Starting application..."
nohup node server.js > server.log 2>&1 &
echo "✅ Deployment Successful!"
