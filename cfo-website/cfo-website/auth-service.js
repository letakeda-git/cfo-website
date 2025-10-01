// AWS Authentication Service
class AWSAuthService {
    constructor() {
        // AWS Configuration - Replace with your actual values
        this.config = {
            region: 'eu-west-1', // Replace with your AWS region
            userPoolId: 'eu-west-1_XzBjrQrxK', // Replace with your Cognito User Pool ID
            clientId: '7t57ikg2csoqoh93r7bujhe6hc', // Replace with your Cognito App Client ID
            clientSecret: '1b8652oai8k2csk1re0s395a8acfke41d97v0v3fsdvtv7k90dpt', // Replace with your Cognito App Client Secret
            identityPoolId: 'eu-west-1:fc3bb5e7-2087-43cc-953b-5caa8d73a7f3' // Required for DynamoDB access
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
        
        // Initialize Cognito Identity Service Provider for client-side operations
        this.cognitoISP = new AWS.CognitoIdentityServiceProvider();
        
        // Set up user pool data for client-side authentication
        this.userPoolData = {
            UserPoolId: this.config.userPoolId,
            ClientId: this.config.clientId
        };
        
        // Initialize DynamoDB after authentication
        this.dynamoDB = null;
    }

    async initializeDynamoDB() {
        return new Promise((resolve) => {
            try {
                // Get ID token for authentication
                const idToken = localStorage.getItem('idToken');
                if (!idToken) {
                    resolve({
                        success: false,
                        error: 'User not authenticated'
                    });
                    return;
                }

                // Configure AWS credentials using Cognito Identity Pool
                if (this.config.identityPoolId && this.config.identityPoolId !== 'eu-west-1:YOUR_IDENTITY_POOL_ID') {
                    // Configure Cognito Identity Pool for temporary credentials
                    AWS.config.credentials = new AWS.CognitoIdentityCredentials({
                        IdentityPoolId: this.config.identityPoolId,
                        Logins: {
                            [`cognito-idp.${this.config.region}.amazonaws.com/${this.config.userPoolId}`]: idToken
                        }
                    });

                    // Refresh credentials before using them
                    AWS.config.credentials.refresh((error) => {
                        if (error) {
                            console.error('Error refreshing credentials:', error);
                            resolve({
                                success: false,
                                error: 'Failed to refresh AWS credentials: ' + error.message
                            });
                        } else {
                            console.log('AWS credentials refreshed successfully');
                            // Initialize DynamoDB with refreshed credentials
                            this.dynamoDB = new AWS.DynamoDB.DocumentClient();
                            resolve({ success: true });
                        }
                    });
                } else {
                    resolve({
                        success: false,
                        error: 'Identity Pool ID not configured. Please set up Cognito Identity Pool for DynamoDB access.'
                    });
                }
            } catch (error) {
                console.error('Error initializing DynamoDB:', error);
                resolve({
                    success: false,
                    error: 'Failed to initialize DynamoDB: ' + error.message
                });
            }
        });
    }

    // Calculate SECRET_HASH for Cognito App Client with secret
    calculateSecretHash(username) {
        const crypto = window.crypto || window.msCrypto;
        if (!crypto || !crypto.subtle) {
            console.error('Web Crypto API not available');
            return null;
        }

        // SECRET_HASH = HMAC-SHA256(ClientSecret, Username + ClientId)
        const message = username + this.config.clientId;
        const encoder = new TextEncoder();
        const keyData = encoder.encode(this.config.clientSecret);
        const messageData = encoder.encode(message);

        return crypto.subtle.importKey(
            'raw',
            keyData,
            { name: 'HMAC', hash: 'SHA-256' },
            false,
            ['sign']
        ).then(key => {
            return crypto.subtle.sign('HMAC', key, messageData);
        }).then(signature => {
            // Convert ArrayBuffer to base64
            const bytes = new Uint8Array(signature);
            let binary = '';
            for (let i = 0; i < bytes.byteLength; i++) {
                binary += String.fromCharCode(bytes[i]);
            }
            return btoa(binary);
        }).catch(error => {
            console.error('Error calculating SECRET_HASH:', error);
            return null;
        });
    }

    async authenticateUser(email, password) {
        return new Promise(async (resolve) => {
            try {
                // Calculate SECRET_HASH if client secret is configured
                let secretHash = null;
                if (this.config.clientSecret && this.config.clientSecret !== 'YOUR_CLIENT_SECRET_HERE') {
                    secretHash = await this.calculateSecretHash(email);
                    if (!secretHash) {
                        resolve({
                            success: false,
                            error: 'Erro ao calcular SECRET_HASH. Verifique a configuração.'
                        });
                        return;
                    }
                }

                // Use AWS SDK v2 InitiateAuth for client-side authentication
                const authParams = {
                    USERNAME: email,
                    PASSWORD: password
                };

                // Add SECRET_HASH if available
                if (secretHash) {
                    authParams.SECRET_HASH = secretHash;
                }

                const params = {
                    ClientId: this.config.clientId,
                    AuthFlow: 'USER_PASSWORD_AUTH',
                    AuthParameters: authParams
                };

                this.cognitoISP.initiateAuth(params, (error, result) => {
                    if (error) {
                        console.error('Authentication error:', error);
                        resolve({
                            success: false,
                            error: this.getErrorMessage(error)
                        });
                    } else {
                        console.log('Authentication result:', result);
                        
                        // Handle different response structures
                        let authResult = null;
                        if (result.AuthenticationResult) {
                            authResult = result.AuthenticationResult;
                        } else if (result.ChallengeName) {
                            // Handle challenge response
                            console.log('Challenge required:', result.ChallengeName);
                            
                            if (result.ChallengeName === 'NEW_PASSWORD_REQUIRED') {
                                // Store session for password change
                                localStorage.setItem('cognitoSession', JSON.stringify({
                                    ChallengeName: result.ChallengeName,
                                    Session: result.Session,
                                    ChallengeParameters: result.ChallengeParameters
                                }));
                                
                                resolve({
                                    success: false,
                                    error: 'NEW_PASSWORD_REQUIRED',
                                    challenge: {
                                        name: result.ChallengeName,
                                        session: result.Session,
                                        parameters: result.ChallengeParameters
                                    }
                                });
                            } else {
                                resolve({
                                    success: false,
                                    error: 'Challenge required: ' + result.ChallengeName
                                });
                            }
                            return;
                        } else {
                            console.error('Unexpected response structure:', result);
                            resolve({
                                success: false,
                                error: 'Unexpected authentication response'
                            });
                            return;
                        }
                        
                        // Store tokens in localStorage
                        if (authResult && authResult.AccessToken) {
                            localStorage.setItem('accessToken', authResult.AccessToken);
                            localStorage.setItem('idToken', authResult.IdToken);
                            localStorage.setItem('refreshToken', authResult.RefreshToken);
                            
                            resolve({
                                success: true,
                                tokens: {
                                    accessToken: authResult.AccessToken,
                                    idToken: authResult.IdToken,
                                    refreshToken: authResult.RefreshToken
                                }
                            });
                        } else {
                            console.error('No tokens in response:', authResult);
                            resolve({
                                success: false,
                                error: 'No authentication tokens received'
                            });
                        }
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

    async respondToNewPasswordChallenge(newPassword) {
        return new Promise(async (resolve) => {
            try {
                // Get stored session
                const sessionData = localStorage.getItem('cognitoSession');
                if (!sessionData) {
                    resolve({
                        success: false,
                        error: 'No active session for password change'
                    });
                    return;
                }

                const session = JSON.parse(sessionData);
                console.log('Session data:', session);
                
                // Validate session data
                if (!session.Session || !session.ChallengeParameters) {
                    console.error('Invalid session data:', session);
                    resolve({
                        success: false,
                        error: 'Invalid session data. Please try logging in again.'
                    });
                    return;
                }
                
                // Extract username from ChallengeParameters
                let username = null;
                if (session.ChallengeParameters.USERNAME) {
                    username = session.ChallengeParameters.USERNAME;
                } else if (session.ChallengeParameters.USER_ID_FOR_SRP) {
                    username = session.ChallengeParameters.USER_ID_FOR_SRP;
                } else if (session.ChallengeParameters.userAttributes) {
                    try {
                        const userAttributes = JSON.parse(session.ChallengeParameters.userAttributes);
                        username = userAttributes.email;
                    } catch (error) {
                        console.error('Error parsing userAttributes:', error);
                    }
                }
                
                if (!username) {
                    console.error('Could not extract username from session:', session.ChallengeParameters);
                    resolve({
                        success: false,
                        error: 'Could not extract username from session. Please try logging in again.'
                    });
                    return;
                }
                
                // Calculate SECRET_HASH if needed
                let secretHash = null;
                if (this.config.clientSecret && this.config.clientSecret !== 'YOUR_CLIENT_SECRET_HERE') {
                    secretHash = await this.calculateSecretHash(username);
                }

                const challengeResponses = {
                    USERNAME: username,
                    NEW_PASSWORD: newPassword
                };

                // Add SECRET_HASH if available
                if (secretHash) {
                    challengeResponses.SECRET_HASH = secretHash;
                }

                const params = {
                    ClientId: this.config.clientId,
                    ChallengeName: 'NEW_PASSWORD_REQUIRED',
                    Session: session.Session,
                    ChallengeResponses: challengeResponses
                };

                console.log('Challenge parameters:', params);
                console.log('Session from storage:', session);
                
                // Use the correct AWS SDK v2 method
                this.cognitoISP.respondToAuthChallenge(params, (error, result) => {
                    if (error) {
                        console.error('Password change error:', error);
                        resolve({
                            success: false,
                            error: this.getErrorMessage(error)
                        });
                    } else {
                        console.log('Password change result:', result);
                        
                        if (result.AuthenticationResult) {
                            // Clear session data
                            localStorage.removeItem('cognitoSession');
                            
                            // Store new tokens
                            const authResult = result.AuthenticationResult;
                            localStorage.setItem('accessToken', authResult.AccessToken);
                            localStorage.setItem('idToken', authResult.IdToken);
                            localStorage.setItem('refreshToken', authResult.RefreshToken);
                            
                            resolve({
                                success: true,
                                tokens: {
                                    accessToken: authResult.AccessToken,
                                    idToken: authResult.IdToken,
                                    refreshToken: authResult.RefreshToken
                                }
                            });
                        } else {
                            console.error('No tokens in password change response:', result);
                            resolve({
                                success: false,
                                error: 'No authentication tokens received after password change'
                            });
                        }
                    }
                });
            } catch (error) {
                console.error('Password change error:', error);
                resolve({
                    success: false,
                    error: this.getErrorMessage(error)
                });
            }
        });
    }

    async refreshToken() {
        return new Promise(async (resolve) => {
            try {
                const refreshToken = localStorage.getItem('refreshToken');
                if (!refreshToken) {
                    resolve(false);
                    return;
                }

                // Get username from stored ID token for SECRET_HASH calculation
                const idToken = localStorage.getItem('idToken');
                let username = null;
                if (idToken) {
                    try {
                        const payload = JSON.parse(atob(idToken.split('.')[1]));
                        username = payload['cognito:username'] || payload.email;
                    } catch (error) {
                        console.error('Error decoding ID token:', error);
                    }
                }

                // Calculate SECRET_HASH if client secret is configured
                let secretHash = null;
                if (this.config.clientSecret && this.config.clientSecret !== 'YOUR_CLIENT_SECRET_HERE' && username) {
                    secretHash = await this.calculateSecretHash(username);
                }

                const authParams = {
                    REFRESH_TOKEN: refreshToken
                };

                // Add SECRET_HASH if available
                if (secretHash) {
                    authParams.SECRET_HASH = secretHash;
                }

                const params = {
                    ClientId: this.config.clientId,
                    AuthFlow: 'REFRESH_TOKEN_AUTH',
                    AuthParameters: authParams
                };

                this.cognitoISP.initiateAuth(params, (error, result) => {
                    if (error) {
                        console.error('Token refresh error:', error);
                        resolve(false);
                    } else {
                        console.log('Refresh token result:', result);
                        
                        if (result.AuthenticationResult && result.AuthenticationResult.AccessToken) {
                            const authResult = result.AuthenticationResult;
                            localStorage.setItem('accessToken', authResult.AccessToken);
                            localStorage.setItem('idToken', authResult.IdToken);
                            resolve(true);
                        } else {
                            console.error('No tokens in refresh response:', result);
                            resolve(false);
                        }
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

    // DynamoDB methods for player management
    async savePlayer(playerData) {
        return new Promise(async (resolve) => {
            try {
                // Try DynamoDB first, fallback to localStorage if it fails
                if (!this.dynamoDB) {
                    const initResult = await this.initializeDynamoDB();
                    if (!initResult.success) {
                        console.warn('DynamoDB not available, using localStorage fallback:', initResult.error);
                        // Fallback to localStorage
                        return this.savePlayerToLocalStorage(playerData, resolve);
                    }
                }

                // Generate unique player ID
                const playerId = 'player_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
                
                const params = {
                    TableName: 'CFOPlayers', // Your actual DynamoDB table name
                    Item: {
                        playerId: playerId,
                        name: playerData.name,
                        age: parseInt(playerData.age),
                        team: playerData.team,
                        jerseyNumber: playerData.jerseyNumber ? parseInt(playerData.jerseyNumber) : null,
                        mobile: playerData.mobile,
                        email: playerData.email || null,
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString()
                    }
                };

                this.dynamoDB.put(params, (error, result) => {
                    if (error) {
                        console.error('DynamoDB error:', error);
                        // Fallback to localStorage
                        this.savePlayerToLocalStorage(playerData, resolve);
                    } else {
                        console.log('Player saved successfully to DynamoDB:', result);
                        resolve({
                            success: true,
                            playerId: playerId,
                            message: 'Jogador adicionado com sucesso!'
                        });
                    }
                });
            } catch (error) {
                console.error('Error saving player:', error);
                // Fallback to localStorage
                this.savePlayerToLocalStorage(playerData, resolve);
            }
        });
    }

    // Fallback method to save to localStorage
    savePlayerToLocalStorage(playerData, resolve) {
        try {
            // Generate unique player ID
            const playerId = 'player_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            
            const player = {
                playerId: playerId,
                name: playerData.name,
                age: parseInt(playerData.age),
                team: playerData.team,
                jerseyNumber: playerData.jerseyNumber ? parseInt(playerData.jerseyNumber) : null,
                mobile: playerData.mobile,
                email: playerData.email || null,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            // Get existing players from localStorage
            const existingPlayers = JSON.parse(localStorage.getItem('cfo_players') || '[]');
            existingPlayers.push(player);
            
            // Save back to localStorage
            localStorage.setItem('cfo_players', JSON.stringify(existingPlayers));
            
            console.log('Player saved to localStorage:', player);
            resolve({
                success: true,
                playerId: playerId,
                message: 'Jogador adicionado com sucesso! (Salvo localmente)'
            });
        } catch (error) {
            console.error('Error saving to localStorage:', error);
            resolve({
                success: false,
                error: 'Erro ao salvar jogador'
            });
        }
    }

    async getPlayers() {
        return new Promise(async (resolve) => {
            try {
                // Try DynamoDB first, fallback to localStorage if it fails
                if (!this.dynamoDB) {
                    const initResult = await this.initializeDynamoDB();
                    if (!initResult.success) {
                        console.warn('DynamoDB not available, using localStorage fallback:', initResult.error);
                        // Fallback to localStorage
                        return this.getPlayersFromLocalStorage(resolve);
                    }
                }

                const params = {
                    TableName: 'CFOPlayers' // Your actual DynamoDB table name
                };

                this.dynamoDB.scan(params, (error, result) => {
                    if (error) {
                        console.error('DynamoDB error:', error);
                        // Fallback to localStorage
                        this.getPlayersFromLocalStorage(resolve);
                    } else {
                        console.log('Players loaded from DynamoDB:', result.Items);
                        resolve({
                            success: true,
                            players: result.Items || []
                        });
                    }
                });
            } catch (error) {
                console.error('Error getting players:', error);
                // Fallback to localStorage
                this.getPlayersFromLocalStorage(resolve);
            }
        });
    }

    // Fallback method to get players from localStorage
    getPlayersFromLocalStorage(resolve) {
        try {
            const players = JSON.parse(localStorage.getItem('cfo_players') || '[]');
            console.log('Players loaded from localStorage:', players);
            resolve({
                success: true,
                players: players
            });
        } catch (error) {
            console.error('Error loading from localStorage:', error);
            resolve({
                success: false,
                error: 'Erro ao carregar jogadores'
            });
        }
    }

    async deletePlayer(playerId) {
        return new Promise(async (resolve) => {
            try {
                // Try DynamoDB first, fallback to localStorage if it fails
                if (!this.dynamoDB) {
                    const initResult = await this.initializeDynamoDB();
                    if (!initResult.success) {
                        console.warn('DynamoDB not available, using localStorage fallback:', initResult.error);
                        // Fallback to localStorage
                        return this.deletePlayerFromLocalStorage(playerId, resolve);
                    }
                }

                const params = {
                    TableName: 'CFOPlayers',
                    Key: {
                        playerId: playerId
                    }
                };

                this.dynamoDB.delete(params, (error, result) => {
                    if (error) {
                        console.error('DynamoDB delete error:', error);
                        // Fallback to localStorage
                        this.deletePlayerFromLocalStorage(playerId, resolve);
                    } else {
                        console.log('Player deleted successfully from DynamoDB:', result);
                        resolve({
                            success: true,
                            message: 'Jogador removido com sucesso!'
                        });
                    }
                });
            } catch (error) {
                console.error('Error deleting player:', error);
                // Fallback to localStorage
                this.deletePlayerFromLocalStorage(playerId, resolve);
            }
        });
    }

    // Fallback method to delete player from localStorage
    deletePlayerFromLocalStorage(playerId, resolve) {
        try {
            // Get existing players from localStorage
            const existingPlayers = JSON.parse(localStorage.getItem('cfo_players') || '[]');
            
            // Filter out the player to delete
            const updatedPlayers = existingPlayers.filter(player => player.playerId !== playerId);
            
            // Save back to localStorage
            localStorage.setItem('cfo_players', JSON.stringify(updatedPlayers));

            console.log('Player deleted from localStorage:', playerId);
            resolve({
                success: true,
                message: 'Jogador removido com sucesso! (Removido localmente)'
            });
        } catch (error) {
            console.error('Error deleting from localStorage:', error);
            resolve({
                success: false,
                error: 'Erro ao remover jogador'
            });
        }
    }

    async updatePlayer(playerId, playerData) {
        return new Promise(async (resolve) => {
            try {
                // Try DynamoDB first, fallback to localStorage if it fails
                if (!this.dynamoDB) {
                    const initResult = await this.initializeDynamoDB();
                    if (!initResult.success) {
                        console.warn('DynamoDB not available, using localStorage fallback:', initResult.error);
                        // Fallback to localStorage
                        return this.updatePlayerInLocalStorage(playerId, playerData, resolve);
                    }
                }

                const params = {
                    TableName: 'CFOPlayers',
                    Key: {
                        playerId: playerId
                    },
                    UpdateExpression: 'SET #name = :name, #age = :age, #team = :team, #jerseyNumber = :jerseyNumber, #mobile = :mobile, #email = :email, #updatedAt = :updatedAt',
                    ExpressionAttributeNames: {
                        '#name': 'name',
                        '#age': 'age',
                        '#team': 'team',
                        '#jerseyNumber': 'jerseyNumber',
                        '#mobile': 'mobile',
                        '#email': 'email',
                        '#updatedAt': 'updatedAt'
                    },
                    ExpressionAttributeValues: {
                        ':name': playerData.name,
                        ':age': parseInt(playerData.age),
                        ':team': playerData.team,
                        ':jerseyNumber': playerData.jerseyNumber ? parseInt(playerData.jerseyNumber) : null,
                        ':mobile': playerData.mobile,
                        ':email': playerData.email || null,
                        ':updatedAt': new Date().toISOString()
                    }
                };

                this.dynamoDB.update(params, (error, result) => {
                    if (error) {
                        console.error('DynamoDB update error:', error);
                        // Fallback to localStorage
                        this.updatePlayerInLocalStorage(playerId, playerData, resolve);
                    } else {
                        console.log('Player updated successfully in DynamoDB:', result);
                        resolve({
                            success: true,
                            message: 'Jogador atualizado com sucesso!'
                        });
                    }
                });
            } catch (error) {
                console.error('Error updating player:', error);
                // Fallback to localStorage
                this.updatePlayerInLocalStorage(playerId, playerData, resolve);
            }
        });
    }

    // Fallback method to update player in localStorage
    updatePlayerInLocalStorage(playerId, playerData, resolve) {
        try {
            // Get existing players from localStorage
            const existingPlayers = JSON.parse(localStorage.getItem('cfo_players') || '[]');
            
            // Find and update the player
            const updatedPlayers = existingPlayers.map(player => {
                if (player.playerId === playerId) {
                    return {
                        ...player,
                        name: playerData.name,
                        age: parseInt(playerData.age),
                        team: playerData.team,
                        jerseyNumber: playerData.jerseyNumber ? parseInt(playerData.jerseyNumber) : null,
                        mobile: playerData.mobile,
                        email: playerData.email || null,
                        updatedAt: new Date().toISOString()
                    };
                }
                return player;
            });
            
            // Save back to localStorage
            localStorage.setItem('cfo_players', JSON.stringify(updatedPlayers));

            console.log('Player updated in localStorage:', playerId);
            resolve({
                success: true,
                message: 'Jogador atualizado com sucesso! (Atualizado localmente)'
            });
        } catch (error) {
            console.error('Error updating in localStorage:', error);
            resolve({
                success: false,
                error: 'Erro ao atualizar jogador'
            });
        }
    }

    async sendEmail(emailAddress, subject, message) {
        return new Promise(async (resolve) => {
            try {
                // Try AWS SES first, fallback to simulation if it fails
                if (!this.ses) {
                    const initResult = await this.initializeSES();
                    if (!initResult.success) {
                        console.warn('SES not available, using simulation:', initResult.error);
                        // Fallback to simulation
                        return this.simulateEmail(emailAddress, subject, message, resolve);
                    }
                }

                const params = {
                    Source: 'noreply@cfo-oeiras.com', // Replace with your verified email
                    Destination: {
                        ToAddresses: [emailAddress]
                    },
                    Message: {
                        Subject: {
                            Data: subject,
                            Charset: 'UTF-8'
                        },
                        Body: {
                            Text: {
                                Data: message,
                                Charset: 'UTF-8'
                            }
                        }
                    }
                };

                this.ses.sendEmail(params, (error, result) => {
                    if (error) {
                        console.error('SES email error:', error);
                        // Fallback to simulation
                        this.simulateEmail(emailAddress, subject, message, resolve);
                    } else {
                        console.log('Email sent successfully via SES:', result);
                        resolve({
                            success: true,
                            messageId: result.MessageId,
                            message: 'Email enviado com sucesso!'
                        });
                    }
                });
            } catch (error) {
                console.error('Error sending email:', error);
                // Fallback to simulation
                this.simulateEmail(emailAddress, subject, message, resolve);
            }
        });
    }

    async initializeSES() {
        return new Promise((resolve) => {
            try {
                const idToken = localStorage.getItem('idToken');
                if (!idToken) {
                    resolve({ success: false, error: 'User not authenticated' });
                    return;
                }

                // Initialize SES with the same credentials as DynamoDB
                this.ses = new AWS.SES();
                resolve({ success: true });
            } catch (error) {
                console.error('Error initializing SES:', error);
                resolve({ success: false, error: 'Failed to initialize SES: ' + error.message });
            }
        });
    }

    // Fallback method to simulate email sending
    simulateEmail(emailAddress, subject, message, resolve) {
        try {
            console.log('Simulating email send:');
            console.log('To:', emailAddress);
            console.log('Subject:', subject);
            console.log('Message:', message);
            
            // Store email in localStorage for demo purposes
            const emailHistory = JSON.parse(localStorage.getItem('cfo_email_history') || '[]');
            emailHistory.push({
                id: 'email_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
                emailAddress: emailAddress,
                subject: subject,
                message: message,
                timestamp: new Date().toISOString(),
                status: 'sent'
            });
            localStorage.setItem('cfo_email_history', JSON.stringify(emailHistory));

            resolve({
                success: true,
                messageId: 'sim_' + Date.now(),
                message: 'Email simulado enviado com sucesso! (Para ativar email real, configure AWS SES)'
            });
        } catch (error) {
            console.error('Error simulating email:', error);
            resolve({
                success: false,
                error: 'Erro ao enviar email'
            });
        }
    }
}

// Initialize the auth service
const authService = new AWSAuthService();
