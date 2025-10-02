#!/bin/bash

# Setup Elastic Beanstalk DynamoDB Permissions
echo "🔐 Setting up DynamoDB permissions for Elastic Beanstalk..."

# Get the account ID
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
echo "Account ID: $ACCOUNT_ID"

# Create IAM policy for DynamoDB access
cat > dynamodb-policy.json << EOF
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "dynamodb:Scan",
                "dynamodb:Query",
                "dynamodb:GetItem",
                "dynamodb:PutItem",
                "dynamodb:UpdateItem",
                "dynamodb:DeleteItem"
            ],
            "Resource": [
                "arn:aws:dynamodb:eu-west-1:$ACCOUNT_ID:table/agatha-oeiras-products",
                "arn:aws:dynamodb:eu-west-1:$ACCOUNT_ID:table/agatha-oeiras-about"
            ]
        }
    ]
}
EOF

# Create the policy
echo "Creating IAM policy..."
aws iam create-policy \
    --policy-name AgathaOeirasDynamoDBAccess \
    --policy-document file://dynamodb-policy.json \
    --description "DynamoDB access for Agatha Oeiras ceramics store"

# Get the policy ARN
POLICY_ARN="arn:aws:iam::$ACCOUNT_ID:policy/AgathaOeirasDynamoDBAccess"

# Attach policy to Elastic Beanstalk service role
echo "Attaching policy to Elastic Beanstalk service role..."
aws iam attach-role-policy \
    --role-name aws-elasticbeanstalk-ec2-role \
    --policy-arn $POLICY_ARN

echo "✅ DynamoDB permissions configured successfully!"
echo "📝 Policy ARN: $POLICY_ARN"
echo "🔄 You may need to restart your Elastic Beanstalk environment for changes to take effect."

# Clean up
rm dynamodb-policy.json
