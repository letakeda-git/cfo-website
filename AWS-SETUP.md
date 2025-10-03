# AWS IAM Integration Setup Guide

This guide will help you connect your login.html to AWS IAM using Amazon Cognito.

## Prerequisites

1. AWS Account
2. AWS CLI installed and configured (optional but recommended)
3. Basic knowledge of AWS services

## Step 1: Create AWS Cognito User Pool

### 1.1 Go to AWS Console
1. Log in to your AWS Console
2. Navigate to **Amazon Cognito** service
3. Click **"Create user pool"**

### 1.2 Configure User Pool
1. **Step 1 - Configure sign-in experience:**
   - Choose **"Email"** as the sign-in option
   - Click **"Next"**

2. **Step 2 - Configure security requirements:**
   - Choose **"No MFA"** (or configure MFA if needed)
   - Password policy: Use default or customize
   - Click **"Next"**

3. **Step 3 - Configure sign-up experience:**
   - Keep default settings
   - Click **"Next"**

4. **Step 4 - Configure message delivery:**
   - Choose **"Send email with Cognito"** (or configure SES if you have it)
   - Click **"Next"**

5. **Step 5 - Integrate your app:**
   - User pool name: `CFO-UserPool` (or your preferred name)
   - Click **"Next"**

6. **Step 6 - Review and create:**
   - Review your settings
   - Click **"Create user pool"**

### 1.3 Create App Client
1. After creating the user pool, go to **"App integration"** tab
2. Click **"Create app client"**
3. App client name: `CFO-WebApp`
4. **Uncheck** "Generate client secret" (important for web apps)
5. Click **"Create app client"**

## Step 2: Configure Your Application

### 2.1 Update AWS Configuration
1. Copy `aws-config.example.js` to `aws-config.js`
2. Update the configuration with your actual values:

```javascript
const AWS_CONFIG = {
    region: 'eu-west-1', // Your AWS region
    userPoolId: 'eu-west-1_XXXXXXXXX', // From Cognito console
    clientId: 'XXXXXXXXXXXXXXXXXXXXXXXXXX', // From Cognito console
    identityPoolId: 'eu-west-1:xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx' // Optional
};
```

### 2.2 Update auth-service.js
Update the configuration in `auth-service.js`:

```javascript
this.config = {
    region: 'YOUR_REGION',
    userPoolId: 'YOUR_USER_POOL_ID',
    clientId: 'YOUR_CLIENT_ID',
    identityPoolId: 'YOUR_IDENTITY_POOL_ID' // Optional
};
```

## Step 3: Create Test Users

### 3.1 Create User via AWS Console
1. Go to your User Pool in Cognito console
2. Click **"Users"** tab
3. Click **"Create user"**
4. Fill in:
   - Username: `admin@cfo.com`
   - Email: `admin@cfo.com`
   - Temporary password: `TempPass123!`
5. Check **"Mark email as verified"**
6. Click **"Create user"**

### 3.2 Set Permanent Password
1. After creating the user, click on the username
2. Click **"Actions"** → **"Set permanent password"**
3. Set a new password: `AdminPass123!`
4. Uncheck **"User must create a new password at next sign-in"**
5. Click **"Set password"**

## Step 4: Test the Integration

### 4.1 Start Your Development Server
```bash
npm run dev
```

### 4.2 Test Login
1. Navigate to `http://localhost:5173/login.html`
2. Use the credentials you created:
   - Email: `admin@cfo.com`
   - Password: `AdminPass123!`
3. You should be redirected to the admin dashboard

## Step 5: Production Considerations

### 5.1 Security
- Never commit `aws-config.js` to version control
- Use environment variables in production
- Consider implementing HTTPS
- Set up proper CORS policies

### 5.2 Additional Features
- Password reset functionality
- User registration
- Role-based access control
- Multi-factor authentication

## Troubleshooting

### Common Issues

1. **"AWS SDK not loaded" error:**
   - Ensure the AWS SDK script is loaded before auth-service.js
   - Check your internet connection

2. **"UserNotFoundException":**
   - Verify the user exists in Cognito
   - Check the email/username format

3. **"NotAuthorizedException":**
   - Verify the password is correct
   - Check if the user account is confirmed

4. **CORS errors:**
   - Add your domain to Cognito's allowed origins
   - Configure CORS in your web server

### Debug Mode
Add this to your browser console to see detailed error messages:
```javascript
localStorage.setItem('debug', 'true');
```

## File Structure
```
cfo-website/
├── login.html          # Login page with AWS integration
├── admin.html          # Admin dashboard (protected)
├── auth-service.js     # AWS authentication service
├── aws-config.js      # AWS configuration (create this)
├── aws-config.example.js # Configuration template
└── styles.css         # Updated with auth message styles
```

## Next Steps

1. **Customize the admin dashboard** with your specific features
2. **Implement user management** (create, update, delete users)
3. **Add role-based permissions** for different user types
4. **Set up monitoring** with CloudWatch
5. **Implement backup and recovery** strategies

## Support

For AWS-specific issues:
- [AWS Cognito Documentation](https://docs.aws.amazon.com/cognito/)
- [AWS Support](https://aws.amazon.com/support/)

For application issues:
- Check browser console for JavaScript errors
- Verify network connectivity
- Ensure all files are properly linked
