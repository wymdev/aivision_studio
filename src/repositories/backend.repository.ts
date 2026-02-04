import { backendConfig } from "@/config/backend.config";
import { authService } from "@/services/auth.service";
import { BackendResponse } from "@/types/backend.types";

export class BackendRepository {
  private apiBaseUrl: string;

  constructor() {
    this.apiBaseUrl = backendConfig.apiBaseUrl;
  }

  async detectObjects(imageFile: File): Promise<BackendResponse> {
    return this.detectObjectsWithRetry(imageFile);
  }

  private async detectObjectsWithRetry(imageFile: File, retryCount = 0): Promise<BackendResponse> {
    // Get OAuth2 access token
    const accessToken = await authService.getToken();

    const base64Image = await this.fileToBase64(imageFile);
    const predictionUrl = `${this.apiBaseUrl}${backendConfig.endpoints.prediction}`;

    const response = await fetch(predictionUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Authorization": `Bearer ${accessToken}`,
      },
      body: base64Image,
    });

    if (!response.ok) {
      const errorText = await response.text();

      if (response.status === 401 && retryCount < 1) {
        console.log("Token expired. Retrying request...");
        authService.clearToken();
        return this.detectObjectsWithRetry(imageFile, retryCount + 1);
      }

      console.error('API Error:', {
        status: response.status,
        statusText: response.statusText,
        errorText,
        apiUrl: this.apiBaseUrl
      });

      throw new Error(`API error: ${response.status} - ${errorText || response.statusText}`);
    }

    return await response.json();
  }

  async detectFromBase64(base64Image: string): Promise<BackendResponse> {
    // Get OAuth2 access token
    const accessToken = await authService.getToken();

    const predictionUrl = `${this.apiBaseUrl}${backendConfig.endpoints.prediction}`;

    const response = await fetch(predictionUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Authorization": `Bearer ${accessToken}`,
      },
      body: base64Image,
    });

    if (!response.ok) {
      if (response.status === 401) {
        // Simple retry logic could be added here similar to detectObjects if needed
        authService.clearToken();
        throw new Error("Token expired. Please retry."); // For now, throw to propagate
      }
      throw new Error(`API error: ${response.statusText}`);
    }

    return await response.json();
  }

  private fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        // Strip the data URI prefix (data:image/...;base64,) and return only base64 string
        const base64 = result.split(",")[1];
        resolve(base64);
      };
      reader.onerror = (error) => reject(error);
    });
  }
}

export const backendRepository = new BackendRepository();
