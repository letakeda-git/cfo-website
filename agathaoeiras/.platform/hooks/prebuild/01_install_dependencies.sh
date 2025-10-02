#!/bin/bash

# Install Node.js dependencies
echo "Installing Node.js dependencies..."
npm install --production

# Verify dotenv is installed
if [ ! -d "node_modules/dotenv" ]; then
    echo "ERROR: dotenv module not found after installation"
    exit 1
fi

echo "Dependencies installed successfully"
