// AWS Authentication Service
class AWSAuthService {
    constructor() {
        // AWS Configuration - Replace with your actual values
        this.config = {
            region: 'eu-west-1', // Replace with your AWS region
            userPoolId: 'eu-west-1_4MYO9ULQu', // Replace with your Cognito User Pool ID
            clientId: '3mgf4us1uqjr98adjjqb8h93m7', // Replace with your Cognito App Client ID
            //identityPoolId: 'YOUR_IDENTITY_POOL_ID' // Optional: for temporary credentials
        };
        
        // Initialize AWS SDK
        this.initializeAWS();
    }

    initializeAWS() {
        // Load AWS SDK from CDN (for browser usage)
        if (typeof AWS === 'undefined') {
            console.error('AWS SDK not loaded. Please include AWS SDK in your HTML.');
            return;
        }
        
        // Configure AWS Cognito
        AWS.config.region = this.config.region;
        
        // Initialize Cognito User Pool
        this.userPool = new AWS.CognitoIdentityServiceProvider.CognitoUserPool({
            UserPoolId: this.config.userPoolId,
            ClientId: this.config.clientId
        });
    }

    async authenticateUser(email, password) {
        return new Promise((resolve) => {
            try {
                // Create authentication details
                const authenticationDetails = new AWS.CognitoIdentityServiceProvider.AuthenticationDetails({
                    Username: email,
                    Password: password
                });

                // Create user data
                const userData = {
                    Username: email,
                    Pool: this.userPool
                };

                const cognitoUser = new AWS.CognitoIdentityServiceProvider.CognitoUser(userData);

                // Authenticate user
                cognitoUser.authenticateUser(authenticationDetails, {
                    onSuccess: (result) => {
                        // Store tokens in localStorage
                        localStorage.setItem('accessToken', result.getAccessToken().getJwtToken());
                        localStorage.setItem('idToken', result.getIdToken().getJwtToken());
                        localStorage.setItem('refreshToken', result.getRefreshToken().getToken());
                        
                        resolve({
                            success: true,
                            tokens: {
                                accessToken: result.getAccessToken().getJwtToken(),
                                idToken: result.getIdToken().getJwtToken(),
                                refreshToken: result.getRefreshToken().getToken()
                            }
                        });
                    },
                    onFailure: (error) => {
                        console.error('Authentication error:', error);
                        resolve({
                            success: false,
                            error: this.getErrorMessage(error)
                        });
                    },
                    newPasswordRequired: (userAttributes, requiredAttributes) => {
                        // Handle new password required
                        resolve({
                            success: false,
                            error: 'Nova palavra-passe necessária. Contacte o administrador.'
                        });
                    }
                });
            } catch (error) {
                console.error('Authentication error:', error);
                resolve({
                    success: false,
                    error: this.getErrorMessage(error)
                });
            }
        });
    }

    async refreshToken() {
        return new Promise((resolve) => {
            try {
                const refreshToken = localStorage.getItem('refreshToken');
                if (!refreshToken) {
                    resolve(false);
                    return;
                }

                // Get user from stored token
                const idToken = localStorage.getItem('idToken');
                if (!idToken) {
                    resolve(false);
                    return;
                }

                // Decode token to get username
                const payload = JSON.parse(atob(idToken.split('.')[1]));
                const username = payload['cognito:username'] || payload.email;

                const userData = {
                    Username: username,
                    Pool: this.userPool
                };

                const cognitoUser = new AWS.CognitoIdentityServiceProvider.CognitoUser(userData);
                const refreshTokenObj = new AWS.CognitoIdentityServiceProvider.CognitoRefreshToken({
                    RefreshToken: refreshToken
                });

                cognitoUser.refreshSession(refreshTokenObj, (error, result) => {
                    if (error) {
                        console.error('Token refresh error:', error);
                        resolve(false);
                    } else {
                        localStorage.setItem('accessToken', result.getAccessToken().getJwtToken());
                        localStorage.setItem('idToken', result.getIdToken().getJwtToken());
                        resolve(true);
                    }
                });
            } catch (error) {
                console.error('Token refresh error:', error);
                resolve(false);
            }
        });
    }

    isAuthenticated() {
        const accessToken = localStorage.getItem('accessToken');
        return !!accessToken;
    }

    logout() {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('idToken');
        localStorage.removeItem('refreshToken');
    }

    getErrorMessage(error) {
        if (error.code === 'NotAuthorizedException') {
            return 'Credenciais inválidas. Verifique o email e palavra-passe.';
        } else if (error.code === 'UserNotFoundException') {
            return 'Utilizador não encontrado.';
        } else if (error.code === 'UserNotConfirmedException') {
            return 'Conta não confirmada. Verifique o seu email.';
        } else if (error.code === 'TooManyRequestsException') {
            return 'Muitas tentativas. Tente novamente mais tarde.';
        } else {
            return 'Erro de autenticação. Tente novamente.';
        }
    }

    // Method to get user information from ID token
    getUserInfo() {
        const idToken = localStorage.getItem('idToken');
        if (!idToken) return null;

        try {
            // Decode JWT token (you might want to use a proper JWT library)
            const payload = JSON.parse(atob(idToken.split('.')[1]));
            return {
                email: payload.email,
                name: payload.name,
                sub: payload.sub
            };
        } catch (error) {
            console.error('Error decoding token:', error);
            return null;
        }
    }
}

// Initialize the auth service
const authService = new AWSAuthService();
