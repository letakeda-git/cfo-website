#!/usr/bin/env node

/**
 * Test script for AWS Cognito integration
 * Run with: node test-cognito.js
 */

require('dotenv').config();
const { authenticateUser, isUserAdmin } = require('./config/cognito');

async function testCognitoIntegration() {
  console.log('🔐 Testing AWS Cognito Integration...\n');
  
  // Check environment variables
  const requiredEnvVars = [
    'AWS_REGION',
    'AWS_ACCESS_KEY_ID', 
    'AWS_SECRET_ACCESS_KEY',
    'COGNITO_USER_POOL_ID',
    'COGNITO_CLIENT_ID'
  ];
  
  const optionalEnvVars = [
    'COGNITO_CLIENT_SECRET'
  ];
  
  console.log('📋 Checking environment variables:');
  let allEnvVarsPresent = true;
  
  requiredEnvVars.forEach(envVar => {
    const value = process.env[envVar];
    if (value) {
      console.log(`✅ ${envVar}: ${envVar.includes('SECRET') || envVar.includes('KEY') ? '***' : value}`);
    } else {
      console.log(`❌ ${envVar}: Not set`);
      allEnvVarsPresent = false;
    }
  });
  
  console.log('\n📋 Optional environment variables:');
  optionalEnvVars.forEach(envVar => {
    const value = process.env[envVar];
    if (value) {
      console.log(`✅ ${envVar}: ${envVar.includes('SECRET') || envVar.includes('KEY') ? '***' : value}`);
    } else {
      console.log(`⚠️  ${envVar}: Not set (may be required for your Cognito client)`);
    }
  });
  
  if (!allEnvVarsPresent) {
    console.log('\n❌ Missing required environment variables.');
    console.log('Please check your .env file and ensure all AWS Cognito variables are set.');
    console.log('See COGNITO-SETUP.md for detailed setup instructions.');
    return;
  }
  
  console.log('\n✅ All environment variables are set.');
  
  // Test authentication (you'll need to provide actual credentials)
  console.log('\n🔑 Testing authentication...');
  console.log('Note: This test requires valid Cognito user credentials.');
  console.log('To test authentication, uncomment the test below and provide valid credentials.\n');
  
  /*
  // Uncomment and modify these lines to test with actual credentials
  const testUsername = 'your-test-username';
  const testPassword = 'your-test-password';
  
  try {
    const authResult = await authenticateUser(testUsername, testPassword);
    if (authResult.success) {
      console.log('✅ Authentication successful!');
      console.log('Access Token:', authResult.accessToken ? 'Present' : 'Missing');
      
      // Test admin check
      const adminCheck = await isUserAdmin(testUsername);
      console.log('Admin Status:', adminCheck ? 'Admin' : 'Regular User');
    } else {
      console.log('❌ Authentication failed:', authResult.error);
    }
  } catch (error) {
    console.log('❌ Authentication error:', error.message);
  }
  */
  
  console.log('\n📚 Next Steps:');
  console.log('1. Set up your AWS Cognito User Pool (see COGNITO-SETUP.md)');
  console.log('2. Create an admin user in your Cognito User Pool');
  console.log('3. Update your .env file with the correct values');
  console.log('4. Test the admin login at http://localhost:3000/admin/login');
  console.log('\n🎉 Cognito integration setup complete!');
}

// Run the test
testCognitoIntegration().catch(console.error);
