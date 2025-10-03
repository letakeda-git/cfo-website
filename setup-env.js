#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const envPath = path.join(__dirname, '.env');
const envExamplePath = path.join(__dirname, 'env.example');

console.log('🔧 Setting up environment variables...\n');

// Check if .env already exists
if (fs.existsSync(envPath)) {
    console.log('✅ .env file already exists');
    console.log('📝 Please edit .env file with your AWS credentials\n');
} else {
    // Create .env from template
    if (fs.existsSync(envExamplePath)) {
        fs.copyFileSync(envExamplePath, envPath);
        console.log('✅ Created .env file from template');
        console.log('📝 Please edit .env file with your AWS credentials\n');
    } else {
        // Create basic .env file
        const envContent = `# AWS Configuration
AWS_ACCESS_KEY_ID=your_aws_access_key_here
AWS_SECRET_ACCESS_KEY=your_aws_secret_key_here
AWS_REGION=eu-west-1

# Cognito Configuration
COGNITO_CLIENT_SECRET=your_cognito_client_secret_here

# JWT Secret
JWT_SECRET=your_secure_jwt_secret_key_here

# Server Configuration
PORT=3000
NODE_ENV=development`;

        fs.writeFileSync(envPath, envContent);
        console.log('✅ Created .env file');
        console.log('📝 Please edit .env file with your AWS credentials\n');
    }
}

console.log('📋 Required Environment Variables:');
console.log('   • AWS_ACCESS_KEY_ID - Your AWS access key');
console.log('   • AWS_SECRET_ACCESS_KEY - Your AWS secret key');
console.log('   • COGNITO_CLIENT_SECRET - Your Cognito app client secret');
console.log('   • JWT_SECRET - A secure random string for JWT signing\n');

console.log('🚀 After setting up .env file, restart the server with: npm start\n');

console.log('💡 For testing without AWS credentials, the website will work for basic navigation');
console.log('   but login/admin features will show configuration errors.');
