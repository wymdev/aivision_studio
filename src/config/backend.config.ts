export const backendConfig = {
  apiUrl: process.env.NEXT_PUBLIC_BACKEND_API_URL || 'https://aicountingapi.xynotechmm.online/api/v1/prediction',
  apiKey: process.env.NEXT_PUBLIC_BACKEND_API_KEY || 'kspoef0230043290234naslkfoi@!$wrew',
};

// Debug log on module load
// console.log('Backend Config Loaded:', {
//   apiUrl: backendConfig.apiUrl,
//   apiKeyPresent: !!backendConfig.apiKey,
//   apiKeyLength: backendConfig.apiKey.length,
//   apiKeyPreview: backendConfig.apiKey.substring(0, 4) + '...'
// });
