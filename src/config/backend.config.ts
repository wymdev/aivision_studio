/**
 * Backend API Configuration
 * Uses OAuth2 Client Credentials for authentication
 */
export const backendConfig = {
  // Real API URL - Server Actions will call this directly
  apiBaseUrl: process.env.NEXT_PUBLIC_BACKEND_API_URL || 'https://aicountingapi.xynotechmm.online/api/v1',

  // OAuth2 Client Credentials
  oauth2: {
    clientId: process.env.NEXT_PUBLIC_OAUTH2_CLIENT_ID || 'box-counting-client',
    clientSecret: process.env.NEXT_PUBLIC_OAUTH2_CLIENT_SECRET || '',
    grantType: 'client_credentials',
  },

  // API Endpoints
  endpoints: {
    token: '/auth/token',
    prediction: '/prediction',
    predictionUrl: '/prediction/url',
    health: '/prediction/health',
  },
};
