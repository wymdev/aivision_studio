import { backendConfig } from "@/config/backend.config";
import { authService } from "@/services/auth.service";
import { AiCountingResponse, AiCountingData } from "@/types/backend.types";

export class BackendService {
  private apiBaseUrl: string;

  constructor() {
    this.apiBaseUrl = backendConfig.apiBaseUrl;
  }

  async detectObjects(imageFile: File | File[]): Promise<AiCountingData | AiCountingData[]> {
    return this.detectObjectsWithRetry(imageFile);
  }

  private async detectObjectsWithRetry(imageFile: File | File[], retryCount = 0): Promise<AiCountingData | AiCountingData[]> {
    try {
      // Get OAuth2 access token
      const accessToken = await authService.getToken();

      const formData = new FormData();

      // Check if it's an array of files or a single file
      if (Array.isArray(imageFile)) {
        imageFile.forEach((file) => {
          formData.append("images", file);
        });
      } else {
        formData.append("image", imageFile);
      }

      // Add other required fields
      formData.append("confidence", "0.5");
      formData.append("overlap", "0.5");

      const predictionUrl = `${this.apiBaseUrl}${backendConfig.endpoints.prediction}`;

      const response = await fetch(predictionUrl, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();

        // If unauthorized, clear token and retry once
        if (response.status === 401 && retryCount < 1) {
          console.log("Token expired or invalid. Refreshing token and retrying...");
          authService.clearToken();
          return this.detectObjectsWithRetry(imageFile, retryCount + 1);
        }

        console.error('API Error Response:', response.status, errorText);
        throw new Error(`API error: ${response.status} - ${errorText}`);
      }

      const result: AiCountingResponse = await response.json();
      console.log('API Response:', result);

      if (!result.success) {
        throw new Error('API returned success: false');
      }

      if ('results' in result.data) {
        return result.data.results;
      } else {
        return result.data;
      }
    } catch (error) {
      console.error("Error detecting objects:", error);
      throw error;
    }
  }

  async getModelEvaluation(): Promise<any> {
    console.warn("getModelEvaluation is not implemented for the new backend.");
    return Promise.resolve({
      model: { id: "unknown", name: "AI Counting", version: "1.0" },
      metrics: { precision: 0, recall: 0, mAP: 0, mAP50: 0, mAP75: 0 },
      classes: []
    });
  }
}

export const backendService = new BackendService();
