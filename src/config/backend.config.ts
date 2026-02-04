/**
 * Backend API Configuration
 * Uses OAuth2 Client Credentials for authentication
 */
export const backendConfig = {
  // Real API URL - Server Actions will call this directly
  apiBaseUrl: (() => {
    let url = process.env.NEXT_PUBLIC_BACKEND_API_URL || 'https://aicountingapi.xynotechmm.online/api/v1';
    // Remove trailing slash
    if (url.endsWith('/')) {
      url = url.slice(0, -1);
    }
    // Append /api/v1 if not present
    if (!url.endsWith('/api/v1')) {
      url = `${url}/api/v1`;
    }
    return url;
  })(),

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
