#!/bin/bash

# Agatha Oeiras Ceramics Store - AWS Elastic Beanstalk Deployment Script

echo "🏺 Deploying Agatha Oeiras Ceramics Store to AWS Elastic Beanstalk..."

# Check if EB CLI is installed
if ! command -v eb &> /dev/null; then
    echo "❌ AWS EB CLI is not installed. Please install it first:"
    echo "   pip install awsebcli"
    echo "   or visit: https://docs.aws.amazon.com/elasticbeanstalk/latest/dg/eb-cli3-install.html"
    exit 1
fi

# Check if user is logged in to AWS
if ! aws sts get-caller-identity &> /dev/null; then
    echo "❌ Not logged in to AWS. Please run:"
    echo "   aws configure"
    exit 1
fi

# Initialize EB application if not already done
if [ ! -f ".elasticbeanstalk/config.yml" ]; then
    echo "📦 Initializing Elastic Beanstalk application..."
    eb init agatha-oeiras-ceramics --platform node.js --region eu-west-1
fi

# Create environment if it doesn't exist
echo "🌱 Creating/updating Elastic Beanstalk environment..."
eb create agatha-oeiras-prod --instance-type t3.micro --platform node.js --region eu-west-1 || eb deploy

echo "🚀 Deployment complete!"
echo "🌐 Your Agatha Oeiras ceramics store is now live!"
echo "📱 Check your AWS Elastic Beanstalk console for the URL"

