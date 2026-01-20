import { backendConfig } from "@/config/backend.config";
import { AiCountingResponse, AiCountingData, BackendResponse, DetectionStats } from "@/types/backend.types";

export class BackendService {
  private apiUrl: string;
  private apiKey: string;

  constructor() {
    this.apiUrl = backendConfig.apiUrl;
    this.apiKey = backendConfig.apiKey;
  }

  async detectObjects(imageFile: File | File[]): Promise<AiCountingData | AiCountingData[]> {
    try {
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

      console.log('Service sending request to:', this.apiUrl);
      console.log('API Key length:', this.apiKey?.length);

      const response = await fetch(this.apiUrl, {
        method: "POST",
        headers: {
          "X-API-Key": this.apiKey,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
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

  // Legacy method kept or adapted if needed, but for now specific to new API
  // The interface expects getDetectionStats but the new API doesn't return predictions list.
  // We will need to adapt the consuming code.

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
