import { roboflowConfig } from "@/config/roboflow.config";
import { RoboflowResponse, DetectionStats } from "@/types/roboflow.types";

export class RoboflowService {
  private apiUrl: string;
  private apiKey: string;

  constructor() {
    this.apiUrl = roboflowConfig.apiUrl;
    this.apiKey = roboflowConfig.apiKey;
  }

  async detectObjects(imageFile: File): Promise<RoboflowResponse> {
    try {
      // Convert image to base64
      const base64Image = await this.fileToBase64(imageFile);

      console.log('Service sending request:', {
        apiUrl: this.apiUrl,
        apiKeyLength: this.apiKey.length,
        base64Length: base64Image.length
      });

      const response = await fetch(`${this.apiUrl}?api_key=${this.apiKey}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: base64Image,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error Response:', errorText);
        throw new Error(`Roboflow API error: ${response.status}`);
      }

      const data: RoboflowResponse = await response.json();
      return data;
    } catch (error) {
      console.error("Error detecting objects:", error);
      throw error;
    }
  }

  async detectFromUrl(imageUrl: string): Promise<RoboflowResponse> {
    try {
      const response = await fetch(
        `${this.apiUrl}?api_key=${this.apiKey}&image=${encodeURIComponent(imageUrl)}`,
        {
          method: "POST",
        }
      );

      if (!response.ok) {
        throw new Error(`Roboflow API error: ${response.status}`);
      }

      const data: RoboflowResponse = await response.json();
      return data;
    } catch (error) {
      console.error("Error detecting objects from URL:", error);
      throw error;
    }
  }

  getDetectionStats(response: RoboflowResponse): DetectionStats {
    const uniqueClasses = Array.from(
      new Set(response.predictions.map((p) => p.class))
    );

    const classCounts = response.predictions.reduce((acc, pred) => {
      acc[pred.class] = (acc[pred.class] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalDetections: response.predictions.length,
      uniqueClasses,
      classCounts,
    };
  }

  private fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        // Remove data:image/...;base64, prefix
        const base64 = result.split(",")[1];
        resolve(base64);
      };
      reader.onerror = (error) => reject(error);
    });
  }
}

export const roboflowService = new RoboflowService();
