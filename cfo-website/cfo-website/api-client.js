// API Client for communicating with the Node.js backend
if (typeof APIClient === 'undefined') {
class APIClient {
    constructor() {
        this.baseURL = window.location.origin;
        this.token = localStorage.getItem('authToken');
    }

    setToken(token) {
        this.token = token;
        localStorage.setItem('authToken', token);
    }

    clearToken() {
        this.token = null;
        localStorage.removeItem('authToken');
    }

    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        const config = {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        };

        if (this.token) {
            config.headers.Authorization = `Bearer ${this.token}`;
        }

        try {
            const response = await fetch(url, config);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Request failed');
            }

            return data;
        } catch (error) {
            console.error('API request error:', error);
            throw error;
        }
    }

    // Authentication methods
    async login(username, password) {
        const result = await this.request('/api/auth/login', {
            method: 'POST',
            body: JSON.stringify({ username, password })
        });

        if (result.success && result.token) {
            this.setToken(result.token);
        }

        return result;
    }

    async setNewPassword(username, newPassword, session) {
        const result = await this.request('/api/auth/new-password', {
            method: 'POST',
            body: JSON.stringify({ username, newPassword, session })
        });

        if (result.success && result.token) {
            this.setToken(result.token);
        }

        return result;
    }

    // Player management methods
    async getPlayers() {
        return await this.request('/api/players');
    }

    async addPlayer(playerData) {
        return await this.request('/api/players', {
            method: 'POST',
            body: JSON.stringify(playerData)
        });
    }

    async updatePlayer(playerId, playerData) {
        return await this.request(`/api/players/${playerId}`, {
            method: 'PUT',
            body: JSON.stringify(playerData)
        });
    }

    async deletePlayer(playerId) {
        return await this.request(`/api/players/${playerId}`, {
            method: 'DELETE'
        });
    }

    // Coach management methods
    async getCoaches() {
        return await this.request('/api/coaches');
    }

    async addCoach(coachData) {
        return await this.request('/api/coaches', {
            method: 'POST',
            body: JSON.stringify(coachData)
        });
    }

    async updateCoach(coachId, coachData) {
        return await this.request(`/api/coaches/${coachId}`, {
            method: 'PUT',
            body: JSON.stringify(coachData)
        });
    }

    async deleteCoach(coachId) {
        return await this.request(`/api/coaches/${coachId}`, {
            method: 'DELETE'
        });
    }

    // Coordinator management methods
    async getCoordinators() {
        return await this.request('/api/coordinators');
    }

    async addCoordinator(coordinatorData) {
        return await this.request('/api/coordinators', {
            method: 'POST',
            body: JSON.stringify(coordinatorData)
        });
    }

    async updateCoordinator(coordinatorId, coordinatorData) {
        return await this.request(`/api/coordinators/${coordinatorId}`, {
            method: 'PUT',
            body: JSON.stringify(coordinatorData)
        });
    }

    async deleteCoordinator(coordinatorId) {
        return await this.request(`/api/coordinators/${coordinatorId}`, {
            method: 'DELETE'
        });
    }

    // Email methods
    async sendEmail(email, subject, message) {
        return await this.request('/api/send-email', {
            method: 'POST',
            body: JSON.stringify({ email, subject, message })
        });
    }
}

// Create global API client instance
if (typeof window.apiClient === 'undefined') {
    window.apiClient = new APIClient();
}
}
