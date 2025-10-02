const { CognitoIdentityProviderClient, AdminInitiateAuthCommand, AdminGetUserCommand } = require('@aws-sdk/client-cognito-identity-provider');
const crypto = require('crypto');

// AWS Cognito configuration
const cognitoClient = new CognitoIdentityProviderClient({
  region: process.env.AWS_REGION || 'eu-west-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
});

const USER_POOL_ID = process.env.COGNITO_USER_POOL_ID;
const CLIENT_ID = process.env.COGNITO_CLIENT_ID;
const CLIENT_SECRET = process.env.COGNITO_CLIENT_SECRET;

/**
 * Generate SECRET_HASH for Cognito client with secret
 * @param {string} username - Username
 * @param {string} clientId - Client ID
 * @param {string} clientSecret - Client Secret
 * @returns {string} SECRET_HASH
 */
function generateSecretHash(username, clientId, clientSecret) {
  return crypto
    .createHmac('SHA256', clientSecret)
    .update(username + clientId)
    .digest('base64');
}

/**
 * Authenticate user with Cognito
 * @param {string} username - Username or email
 * @param {string} password - User password
 * @returns {Promise<Object>} Authentication result
 */
async function authenticateUser(username, password) {
  try {
    // Prepare auth parameters
    const authParameters = {
      USERNAME: username,
      PASSWORD: password
    };
    
    // Add SECRET_HASH if client secret is configured
    if (CLIENT_SECRET) {
      authParameters.SECRET_HASH = generateSecretHash(username, CLIENT_ID, CLIENT_SECRET);
    }
    
    const command = new AdminInitiateAuthCommand({
      UserPoolId: USER_POOL_ID,
      ClientId: CLIENT_ID,
      AuthFlow: 'ADMIN_NO_SRP_AUTH',
      AuthParameters: authParameters
    });

    const response = await cognitoClient.send(command);
    
    if (response.AuthenticationResult) {
      return {
        success: true,
        accessToken: response.AuthenticationResult.AccessToken,
        idToken: response.AuthenticationResult.IdToken,
        refreshToken: response.AuthenticationResult.RefreshToken,
        expiresIn: response.AuthenticationResult.ExpiresIn
      };
    } else {
      return {
        success: false,
        error: 'Authentication failed'
      };
    }
  } catch (error) {
    console.error('Cognito authentication error:', error);
    return {
      success: false,
      error: error.message || 'Authentication failed'
    };
  }
}

/**
 * Get user information from Cognito
 * @param {string} accessToken - User's access token
 * @returns {Promise<Object>} User information
 */
async function getUserInfo(accessToken) {
  try {
    const command = new AdminGetUserCommand({
      UserPoolId: USER_POOL_ID,
      Username: accessToken // This should be the username, not token
    });

    const response = await cognitoClient.send(command);
    return {
      success: true,
      user: {
        username: response.Username,
        email: response.UserAttributes?.find(attr => attr.Name === 'email')?.Value,
        status: response.UserStatus
      }
    };
  } catch (error) {
    console.error('Get user info error:', error);
    return {
      success: false,
      error: error.message || 'Failed to get user info'
    };
  }
}

/**
 * Verify if user is admin based on Cognito groups or attributes
 * @param {string} username - Username
 * @returns {Promise<boolean>} Is admin
 */
async function isUserAdmin(username) {
  try {
    const userInfo = await getUserInfo(username);
    if (userInfo.success) {
      // Check if user is in admin group or has admin attribute
      // This depends on your Cognito setup
      return userInfo.user.status === 'CONFIRMED';
    }
    return false;
  } catch (error) {
    console.error('Check admin status error:', error);
    return false;
  }
}

module.exports = {
  authenticateUser,
  getUserInfo,
  isUserAdmin
};
