// AWS Configuration Example
// Copy this file to aws-config.js and fill in your actual values

const AWS_CONFIG = {
    // AWS Region (e.g., 'eu-west-1', 'us-east-1', 'ap-southeast-1')
    region: 'eu-west-1',
    
    // Cognito User Pool ID (found in AWS Cognito console)
    userPoolId: 'eu-west-1_4MYO9ULQu',
    
    // Cognito App Client ID (found in AWS Cognito console)
    clientId: '3mgf4us1uqjr98adjjqb8h93m7'
    
    // Optional: Cognito Identity Pool ID (for temporary credentials)
    //identityPoolId: 'eu-west-1:fc3bb5e7-2087-43cc-953b-5caa8d73a7f3'
};

// Instructions:
// 1. Go to AWS Console > Cognito > User Pools
// 2. Create a new User Pool or use existing one
// 3. Create an App Client (without secret for web apps)
// 4. Copy the User Pool ID and App Client ID
// 5. Update the values above
// 6. Rename this file to aws-config.js
// 7. Update auth-service.js to import from aws-config.js

export default AWS_CONFIG;
