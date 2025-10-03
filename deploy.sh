#!/bin/bash

# CFO Website Deployment Script
# This script uploads your website to EC2 and sets it up

EC2_HOST="34.245.179.65"
EC2_USER="ec2-user"
KEY_PATH="$HOME/.ssh/cfo-website.pem"
PROJECT_NAME="cfo-website"

echo "🚀 Starting CFO Website Deployment..."

# Check if key file exists
if [ ! -f "$KEY_PATH" ]; then
    echo "❌ Error: SSH key not found at $KEY_PATH"
    exit 1
fi

# Set correct permissions for key
chmod 400 "$KEY_PATH"

echo "📦 Creating deployment package..."

# Create a temporary directory for deployment
TEMP_DIR="/tmp/cfo-deployment"
rm -rf "$TEMP_DIR"
mkdir -p "$TEMP_DIR"

# Copy all necessary files
cp -r . "$TEMP_DIR/"
cd "$TEMP_DIR"

# Remove unnecessary files
rm -rf node_modules
rm -rf .git
rm -rf dist
rm -f .env

echo "📤 Uploading files to EC2..."

# Upload files to EC2
scp -i "$KEY_PATH" -r "$TEMP_DIR"/* "$EC2_USER@$EC2_HOST:~/"

echo "🔧 Setting up application on EC2..."

# Connect to EC2 and set up the application
ssh -i "$KEY_PATH" "$EC2_USER@$EC2_HOST" << 'EOF'
    echo "📁 Setting up project directory..."
    cd ~
    
    # Install PM2 globally
    echo "📦 Installing PM2..."
    sudo npm install -g pm2
    
    # Install project dependencies
    echo "📦 Installing project dependencies..."
    npm install
    
    # Create environment file
    echo "⚙️ Creating environment file..."
    cat > .env << 'ENVEOF'
# AWS Configuration
AWS_ACCESS_KEY_ID=your_aws_access_key_here
AWS_SECRET_ACCESS_KEY=your_aws_secret_key_here
AWS_REGION=eu-west-1

# Cognito Configuration
COGNITO_CLIENT_SECRET=your_cognito_client_secret_here

# JWT Secret
JWT_SECRET=your_secure_jwt_secret_key_here

# Server Configuration
PORT=3000
NODE_ENV=production
ENVEOF

    # Start the application with PM2
    echo "🚀 Starting application..."
    pm2 start server.js --name "cfo-website"
    pm2 save
    pm2 startup
    
    echo "✅ Application started successfully!"
    echo "🌐 Your website should be accessible at: http://$EC2_HOST:3000"
    echo "📝 Don't forget to:"
    echo "   1. Edit .env file with your AWS credentials"
    echo "   2. Restart the application: pm2 restart cfo-website"
    echo "   3. Set up nginx for production (optional)"
EOF

# Clean up
rm -rf "$TEMP_DIR"

echo "🎉 Deployment completed!"
echo "🌐 Your website is now running at: http://$EC2_HOST:3000"
echo ""
echo "📋 Next steps:"
echo "1. SSH into your server: ssh -i $KEY_PATH $EC2_USER@$EC2_HOST"
echo "2. Edit .env file with your AWS credentials"
echo "3. Restart the application: pm2 restart cfo-website"
echo "4. Set up nginx for production (optional)"
