export const roboflowConfig = {
  apiUrl: process.env.NEXT_PUBLIC_ROBOFLOW_API_URL || '',
  apiKey: process.env.NEXT_PUBLIC_ROBOFLOW_API_KEY || '',
};

// Debug log on module load
console.log('Roboflow Config Loaded:', {
  apiUrl: roboflowConfig.apiUrl,
  apiKeyPresent: !!roboflowConfig.apiKey,
  apiKeyLength: roboflowConfig.apiKey.length,
  apiKeyPreview: roboflowConfig.apiKey.substring(0, 4) + '...'
});
