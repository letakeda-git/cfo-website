import express from 'express';
import cors from 'cors';
import path from 'path';
import AWS from 'aws-sdk';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import dotenv from 'dotenv';
import fs from 'fs';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('.')); // Serve static files from project root

// AWS Configuration
AWS.config.update({
    region: 'eu-west-1',
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
});

const cognitoISP = new AWS.CognitoIdentityServiceProvider();
const dynamoDB = new AWS.DynamoDB.DocumentClient();
const ses = new AWS.SES();

// Local storage for development
const DATA_FILE = path.join(__dirname, 'data.json');

// Helper functions for local storage
function loadData() {
    try {
        if (fs.existsSync(DATA_FILE)) {
            const data = fs.readFileSync(DATA_FILE, 'utf8');
            return JSON.parse(data);
        }
        return { players: [] };
    } catch (error) {
        console.error('Error loading data:', error);
        return { players: [] };
    }
}

function saveData(data) {
    try {
        fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
        return true;
    } catch (error) {
        console.error('Error saving data:', error);
        return false;
    }
}

// AWS Configuration from your existing config
const config = {
    region: 'eu-west-1',
    userPoolId: 'eu-west-1_XzBjrQrxK',
    clientId: '7t57ikg2csoqoh93r7bujhe6hc',
    clientSecret: process.env.COGNITO_CLIENT_SECRET,
    identityPoolId: 'eu-west-1:fc3bb5e7-2087-43cc-953b-5caa8d73a7f3'
};

// Calculate SECRET_HASH for Cognito
function calculateSecretHash(username) {
    if (!config.clientSecret) {
        throw new Error('COGNITO_CLIENT_SECRET environment variable is not set');
    }
    const message = username + config.clientId;
    return crypto.createHmac('sha256', config.clientSecret).update(message).digest('base64');
}

// Middleware to verify JWT token
function verifyToken(req, res, next) {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({ error: 'No token provided' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(401).json({ error: 'Invalid token' });
    }
}

// Authentication Routes
app.post('/api/auth/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        // Simple development authentication
        if (username === 'admin@cfo-oeiras.com' && password === 'Admin123!') {
            // Generate JWT token for session management
            const token = jwt.sign(
                { 
                    username: username,
                    sub: 'dev-user'
                },
                process.env.JWT_SECRET || 'your-secret-key',
                { expiresIn: '24h' }
            );

            res.json({
                success: true,
                token: token,
                message: 'Login successful'
            });
        } else {
            res.status(400).json({ error: 'Incorrect username or password.' });
        }
    } catch (error) {
        console.error('Login error:', error);
        res.status(400).json({ error: 'Incorrect username or password.' });
    }
});

app.post('/api/auth/new-password', async (req, res) => {
    try {
        const { username, newPassword, session } = req.body;

        const params = {
            ClientId: config.clientId,
            ChallengeName: 'NEW_PASSWORD_REQUIRED',
            Session: session,
            ChallengeResponses: {
                USERNAME: username,
                NEW_PASSWORD: newPassword,
                SECRET_HASH: calculateSecretHash(username)
            }
        };

        const result = await cognitoISP.respondToAuthChallenge(params).promise();

        if (result.AuthenticationResult) {
            const token = jwt.sign(
                { 
                    username: username,
                    sub: result.AuthenticationResult.IdToken 
                },
                process.env.JWT_SECRET || 'your-secret-key',
                { expiresIn: '24h' }
            );

            res.json({
                success: true,
                token: token,
                accessToken: result.AuthenticationResult.AccessToken,
                idToken: result.AuthenticationResult.IdToken,
                refreshToken: result.AuthenticationResult.RefreshToken
            });
        } else {
            res.status(400).json({ error: 'Password change failed' });
        }
    } catch (error) {
        console.error('New password error:', error);
        res.status(400).json({ error: error.message });
    }
});

// Player Management Routes
app.get('/api/players', verifyToken, async (req, res) => {
    try {
        const params = {
            TableName: 'CFOPlayers'
        };

        const result = await dynamoDB.scan(params).promise();
        res.json({ success: true, players: result.Items || [] });
    } catch (error) {
        console.error('Get players error:', error);
        res.status(500).json({ error: 'Failed to fetch players' });
    }
});

app.post('/api/players', verifyToken, async (req, res) => {
    try {
        const { name, age, team, jerseyNumber, mobile, email } = req.body;

        const playerData = {
            playerId: Date.now().toString(),
            name,
            age: parseInt(age),
            team,
            jerseyNumber: jerseyNumber ? parseInt(jerseyNumber) : null,
            mobile,
            email,
            createdAt: new Date().toISOString()
        };

        const params = {
            TableName: 'CFOPlayers',
            Item: playerData
        };

        await dynamoDB.put(params).promise();
        res.json({ success: true, player: playerData });
    } catch (error) {
        console.error('Add player error:', error);
        res.status(500).json({ error: 'Failed to add player' });
    }
});

app.put('/api/players/:id', verifyToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { name, age, team, jerseyNumber, mobile, email } = req.body;

        const params = {
            TableName: 'CFOPlayers',
            Key: { playerId: id },
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
                ':name': name,
                ':age': parseInt(age),
                ':team': team,
                ':jerseyNumber': jerseyNumber ? parseInt(jerseyNumber) : null,
                ':mobile': mobile,
                ':email': email,
                ':updatedAt': new Date().toISOString()
            }
        };

        await dynamoDB.update(params).promise();
        res.json({ success: true });
    } catch (error) {
        console.error('Update player error:', error);
        res.status(500).json({ error: 'Failed to update player' });
    }
});

app.delete('/api/players/:id', verifyToken, async (req, res) => {
    try {
        const { id } = req.params;

        const params = {
            TableName: 'CFOPlayers',
            Key: { playerId: id }
        };

        await dynamoDB.delete(params).promise();
        res.json({ success: true });
    } catch (error) {
        console.error('Delete player error:', error);
        res.status(500).json({ error: 'Failed to delete player' });
    }
});

// Coaches Routes
app.get('/api/coaches', verifyToken, async (req, res) => {
    try {
        const params = {
            TableName: 'CFOCoaches'
        };

        const result = await dynamoDB.scan(params).promise();
        res.json({ success: true, coaches: result.Items || [] });
    } catch (error) {
        console.error('Get coaches error:', error);
        res.status(500).json({ error: 'Failed to fetch coaches' });
    }
});

app.post('/api/coaches', verifyToken, async (req, res) => {
    try {
        const { name, age, team, mobile, email, position } = req.body;

        const coachData = {
            coachId: Date.now().toString(),
            name,
            age: parseInt(age),
            team,
            mobile,
            email,
            position,
            createdAt: new Date().toISOString()
        };

        const params = {
            TableName: 'CFOCoaches',
            Item: coachData
        };

        await dynamoDB.put(params).promise();
        res.json({ success: true, coach: coachData });
    } catch (error) {
        console.error('Add coach error:', error);
        res.status(500).json({ error: 'Failed to add coach' });
    }
});

app.put('/api/coaches/:id', verifyToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { name, age, team, mobile, email, position } = req.body;

        const coachData = {
            coachId: id,
            name,
            age: parseInt(age),
            team,
            mobile,
            email,
            position,
            updatedAt: new Date().toISOString()
        };

        const params = {
            TableName: 'CFOCoaches',
            Key: { coachId: id },
            UpdateExpression: 'SET #name = :name, #age = :age, #team = :team, #mobile = :mobile, #email = :email, #position = :position, #updatedAt = :updatedAt',
            ExpressionAttributeNames: {
                '#name': 'name',
                '#age': 'age',
                '#team': 'team',
                '#mobile': 'mobile',
                '#email': 'email',
                '#position': 'position',
                '#updatedAt': 'updatedAt'
            },
            ExpressionAttributeValues: {
                ':name': coachData.name,
                ':age': coachData.age,
                ':team': coachData.team,
                ':mobile': coachData.mobile,
                ':email': coachData.email,
                ':position': coachData.position,
                ':updatedAt': coachData.updatedAt
            }
        };

        await dynamoDB.update(params).promise();
        res.json({ success: true, coach: coachData });
    } catch (error) {
        console.error('Update coach error:', error);
        res.status(500).json({ error: 'Failed to update coach' });
    }
});

app.delete('/api/coaches/:id', verifyToken, async (req, res) => {
    try {
        const { id } = req.params;

        const params = {
            TableName: 'CFOCoaches',
            Key: { coachId: id }
        };

        await dynamoDB.delete(params).promise();
        res.json({ success: true, message: 'Coach deleted successfully' });
    } catch (error) {
        console.error('Delete coach error:', error);
        res.status(500).json({ error: 'Failed to delete coach' });
    }
});

// Coordinators Routes
app.get('/api/coordinators', verifyToken, async (req, res) => {
    try {
        const params = {
            TableName: 'CFOCoordinadores'
        };

        const result = await dynamoDB.scan(params).promise();
        res.json({ success: true, coordinators: result.Items || [] });
    } catch (error) {
        console.error('Get coordinators error:', error);
        res.status(500).json({ error: 'Failed to fetch coordinators' });
    }
});

app.post('/api/coordinators', verifyToken, async (req, res) => {
    try {
        const { name, age, team, mobile, email } = req.body;

        const coordinatorData = {
            coordinatorId: Date.now().toString(),
            name,
            age: parseInt(age),
            team,
            mobile,
            email,
            createdAt: new Date().toISOString()
        };

        const params = {
            TableName: 'CFOCoordinadores',
            Item: coordinatorData
        };

        await dynamoDB.put(params).promise();
        res.json({ success: true, coordinator: coordinatorData });
    } catch (error) {
        console.error('Add coordinator error:', error);
        res.status(500).json({ error: 'Failed to add coordinator' });
    }
});

app.put('/api/coordinators/:id', verifyToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { name, age, team, mobile, email } = req.body;

        const coordinatorData = {
            coordinatorId: id,
            name,
            age: parseInt(age),
            team,
            mobile,
            email,
            updatedAt: new Date().toISOString()
        };

        const params = {
            TableName: 'CFOCoordinadores',
            Key: { coordinatorId: id },
            UpdateExpression: 'SET #name = :name, #age = :age, #team = :team, #mobile = :mobile, #email = :email, #updatedAt = :updatedAt',
            ExpressionAttributeNames: {
                '#name': 'name',
                '#age': 'age',
                '#team': 'team',
                '#mobile': 'mobile',
                '#email': 'email',
                '#updatedAt': 'updatedAt'
            },
            ExpressionAttributeValues: {
                ':name': coordinatorData.name,
                ':age': coordinatorData.age,
                ':team': coordinatorData.team,
                ':mobile': coordinatorData.mobile,
                ':email': coordinatorData.email,
                ':updatedAt': coordinatorData.updatedAt
            }
        };

        await dynamoDB.update(params).promise();
        res.json({ success: true, coordinator: coordinatorData });
    } catch (error) {
        console.error('Update coordinator error:', error);
        res.status(500).json({ error: 'Failed to update coordinator' });
    }
});

app.delete('/api/coordinators/:id', verifyToken, async (req, res) => {
    try {
        const { id } = req.params;

        const params = {
            TableName: 'CFOCoordinadores',
            Key: { coordinatorId: id }
        };

        await dynamoDB.delete(params).promise();
        res.json({ success: true, message: 'Coordinator deleted successfully' });
    } catch (error) {
        console.error('Delete coordinator error:', error);
        res.status(500).json({ error: 'Failed to delete coordinator' });
    }
});

// Email Routes
app.post('/api/send-email', verifyToken, async (req, res) => {
    try {
        const { email, subject, message } = req.body;

        const params = {
            Source: 'noreply@cfo-oeiras.com',
            Destination: {
                ToAddresses: [email]
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

        const result = await ses.sendEmail(params).promise();
        res.json({ 
            success: true, 
            messageId: result.MessageId,
            message: 'Email sent successfully'
        });
    } catch (error) {
        console.error('Send email error:', error);
        res.status(500).json({ error: 'Failed to send email' });
    }
});

// Serve index.html for root route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});
