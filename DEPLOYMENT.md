# CFO Website Deployment Guide

## Overview
This guide covers deploying the CFO website with a Node.js backend to AWS EC2 for a scalable solution.

## Prerequisites
- AWS Account with EC2, DynamoDB, Cognito, and SES access
- Node.js 18+ installed locally
- AWS CLI configured
- Domain name (optional)

## Step 1: Build the Frontend

```bash
# Install dependencies
npm install

# Build the React frontend
npm run build
```

## Step 2: Set Up Environment Variables

Create a `.env` file in the project root:

```bash
# AWS Configuration
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_REGION=eu-west-1

# Cognito Configuration
COGNITO_CLIENT_SECRET=your_cognito_client_secret

# JWT Secret
JWT_SECRET=your_secure_jwt_secret_key

# Server Configuration
PORT=3000
NODE_ENV=production
```

## Step 3: Deploy to AWS EC2

### 3.1 Launch EC2 Instance

1. **Go to EC2 Console** → Launch Instance
2. **Choose AMI**: Ubuntu Server 22.04 LTS
3. **Instance Type**: t3.micro (free tier) or t3.small
4. **Key Pair**: Create or select existing key pair
5. **Security Group**: Create with these rules:
   - SSH (22) - Your IP
   - HTTP (80) - 0.0.0.0/0
   - HTTPS (443) - 0.0.0.0/0
   - Custom TCP (3000) - 0.0.0.0/0 (for testing)

### 3.2 Connect to EC2 Instance

```bash
ssh -i your-key.pem ubuntu@your-ec2-ip
```

### 3.3 Install Dependencies on EC2

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2 for process management
sudo npm install -g pm2

# Install nginx
sudo apt install nginx -y
```

### 3.4 Deploy Application

```bash
# Clone your repository
git clone https://github.com/your-username/cfo-website.git
cd cfo-website

# Install dependencies
npm install

# Build frontend
npm run build

# Set up environment variables
nano .env
# Add your environment variables here

# Start the application with PM2
pm2 start server.js --name "cfo-website"
pm2 save
pm2 startup
```

### 3.5 Configure Nginx

```bash
sudo nano /etc/nginx/sites-available/cfo-website
```

Add this configuration:

```nginx
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable the site:

```bash
sudo ln -s /etc/nginx/sites-available/cfo-website /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

## Step 4: Set Up SSL with Let's Encrypt

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx -y

# Get SSL certificate
sudo certbot --nginx -d your-domain.com -d www.your-domain.com

# Test auto-renewal
sudo certbot renew --dry-run
```

## Step 5: Configure AWS Services

### 5.1 DynamoDB Table
Ensure your `CFOPlayers` table exists in `eu-west-1` with:
- Partition key: `id` (String)
- No sort key required

### 5.2 IAM Role for EC2
Create an IAM role with these policies:
- `AmazonDynamoDBFullAccess`
- `AmazonCognitoPowerUser`
- `AmazonSESFullAccess`

Attach the role to your EC2 instance.

### 5.3 SES Configuration
1. **Verify your domain** in SES Console
2. **Create SMTP credentials** if needed
3. **Move out of sandbox** for production use

## Step 6: Monitoring and Maintenance

### 6.1 PM2 Commands
```bash
# View logs
pm2 logs cfo-website

# Restart application
pm2 restart cfo-website

# Monitor performance
pm2 monit
```

### 6.2 Nginx Commands
```bash
# Test configuration
sudo nginx -t

# Reload configuration
sudo systemctl reload nginx

# View logs
sudo tail -f /var/log/nginx/error.log
```

## Step 7: Domain Configuration (Optional)

1. **Point your domain** to the EC2 instance IP
2. **Update DNS records**:
   - A record: `@` → EC2 IP
   - A record: `www` → EC2 IP

## Environment Variables Reference

| Variable | Description | Example |
|----------|-------------|---------|
| `AWS_ACCESS_KEY_ID` | AWS Access Key | `AKIA...` |
| `AWS_SECRET_ACCESS_KEY` | AWS Secret Key | `wJalr...` |
| `AWS_REGION` | AWS Region | `eu-west-1` |
| `COGNITO_CLIENT_SECRET` | Cognito App Client Secret | `abc123...` |
| `JWT_SECRET` | JWT signing secret | `your-secret-key` |
| `PORT` | Server port | `3000` |
| `NODE_ENV` | Environment | `production` |

## Troubleshooting

### Common Issues

1. **Port 3000 not accessible**
   - Check security group rules
   - Verify nginx configuration

2. **DynamoDB access denied**
   - Verify IAM role permissions
   - Check AWS credentials

3. **Cognito authentication fails**
   - Verify client secret
   - Check region configuration

4. **SES emails not sending**
   - Verify domain verification
   - Check sandbox mode status

### Logs to Check
```bash
# Application logs
pm2 logs cfo-website

# Nginx logs
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/access.log

# System logs
sudo journalctl -u nginx
```

## Security Considerations

1. **Keep dependencies updated**
2. **Use strong JWT secrets**
3. **Regular security updates**
4. **Monitor access logs**
5. **Use HTTPS only in production**

## Scaling Considerations

1. **Load Balancer**: Use Application Load Balancer for multiple instances
2. **Auto Scaling**: Set up Auto Scaling Groups
3. **Database**: Consider RDS for larger datasets
4. **CDN**: Use CloudFront for static assets
5. **Monitoring**: Set up CloudWatch alarms

## Backup Strategy

1. **Application**: Git repository
2. **Database**: DynamoDB point-in-time recovery
3. **Configuration**: Document all environment variables
4. **SSL Certificates**: Let's Encrypt auto-renewal
