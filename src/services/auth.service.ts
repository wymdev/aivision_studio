import { backendConfig } from "@/config/backend.config";

interface TokenResponse {
    access_token: string;
    token_type: string;
    expires_in: number;
}

/**
 * OAuth2 Authentication Service
 * Manages token acquisition and caching using Client Credentials flow
 */
class AuthService {
    private accessToken: string | null = null;
    private tokenExpiry: number | null = null;
    private tokenPromise: Promise<string> | null = null;

    /**
     * Get a valid access token, fetching a new one if necessary
     */
    async getToken(): Promise<string> {
        // Return cached token if still valid (with 1 minute buffer)
        if (this.accessToken && this.tokenExpiry && this.tokenExpiry > Date.now()) {
            return this.accessToken;
        }

        // If already fetching a token, wait for that request
        if (this.tokenPromise) {
            return this.tokenPromise;
        }

        // Fetch new token
        this.tokenPromise = this.fetchToken();

        try {
            const token = await this.tokenPromise;
            return token;
        } finally {
            this.tokenPromise = null;
        }
    }

    /**
     * Fetch a new token from the auth endpoint
     */
    private async fetchToken(): Promise<string> {
        const tokenUrl = `${backendConfig.apiBaseUrl}${backendConfig.endpoints.token}`;


        const response = await fetch(tokenUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                client_id: backendConfig.oauth2.clientId,
                client_secret: backendConfig.oauth2.clientSecret,
                grant_type: backendConfig.oauth2.grantType,
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Token fetch failed:', response.status, errorText);
            throw new Error(`Authentication failed: ${response.status} - ${errorText}`);
        }

        const data: TokenResponse = await response.json();

        // Cache the token with 1 minute buffer before actual expiry
        this.accessToken = data.access_token;
        this.tokenExpiry = Date.now() + (data.expires_in * 1000) - 60000;

        return this.accessToken;
    }

    /**
     * Clear cached token (useful for logout or token refresh on error)
     */
    clearToken(): void {
        this.accessToken = null;
        this.tokenExpiry = null;
        this.tokenPromise = null;
    }
}

export const authService = new AuthService();
