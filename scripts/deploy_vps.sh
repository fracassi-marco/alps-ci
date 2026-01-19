#!/bin/bash

# Deployment script for Alps-CI application on a VPS

# Exit on error
set -e

# Variables
APP_NAME="alps-ci"
DEPLOY_DIR="/var/www/$APP_NAME"
BUN_PATH="/usr/local/bin/bun" # Adjust if bun is installed elsewhere
SSH_USER=$1
SSH_HOST=$2

# Check if SSH_USER and SSH_HOST are provided
if [ -z "$SSH_USER" ] || [ -z "$SSH_HOST" ]; then
  echo "Usage: $0 <SSH_USER> <SSH_HOST>"
  exit 1
fi

# Ensure bun is installed on the VPS
echo "Checking if Bun is installed on the server..."
ssh $SSH_USER@$SSH_HOST "if ! command -v bun &> /dev/null; then echo 'Bun is not installed on the server. Please install it first.'; exit 1; fi"

# Create deployment directory if it doesn't exist
echo "Creating deployment directory if it doesn't exist..."
ssh $SSH_USER@$SSH_HOST "mkdir -p $DEPLOY_DIR"

# Sync local files to the VPS
echo "Syncing local files to the VPS..."
rsync -avz --exclude="node_modules" --exclude=".git" ./ $SSH_USER@$SSH_HOST:$DEPLOY_DIR

# Install dependencies and build the application
echo "Installing dependencies and building the application..."
ssh $SSH_USER@$SSH_HOST << EOF
  cd $DEPLOY_DIR
  $BUN_PATH install
  $BUN_PATH run build
EOF

echo "Ensuring systemd service exists..."
ssh $SSH_USER@$SSH_HOST << EOF
  SERVICE_FILE="/etc/systemd/system/$APP_NAME.service"
  if [ ! -f "$SERVICE_FILE" ]; then
    echo "Creating systemd service file for $APP_NAME..."
    sudo bash -c 'cat > $SERVICE_FILE << EOL
[Unit]
Description=Alps-CI Service

[Service]
User=root
WorkingDirectory=$DEPLOY_DIR
ExecStart=$BUN_PATH run start
Restart=always

[Install]
WantedBy=multi-user.target
EOL'
    sudo systemctl daemon-reload
    sudo systemctl enable $APP_NAME.service
  fi
EOF

# Restart the application using systemd
echo "Restarting the application using systemd..."
ssh $SSH_USER@$SSH_HOST << EOF
  sudo systemctl restart $APP_NAME.service
EOF

# Output success message
echo "Deployment completed successfully!"
