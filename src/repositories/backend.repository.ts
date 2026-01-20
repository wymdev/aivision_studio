import { BackendResponse } from "@/types/backend.types";

export class BackendRepository {
  private apiUrl: string;
  private apiKey: string;

  constructor() {
    this.apiUrl = process.env.NEXT_PUBLIC_BACKEND_API_URL || "";
    this.apiKey = process.env.NEXT_PUBLIC_BACKEND_API_KEY || "";

    // Debug logging
    console.log('Backend Config:', {
      apiUrl: this.apiUrl,
      apiKeyLength: this.apiKey.length,
      apiKeyPreview: this.apiKey.substring(0, 4) + '...'
    });
  }

  async detectObjects(imageFile: File): Promise<BackendResponse> {
    // Convert file to base64
    const base64Image = await this.fileToBase64(imageFile);

    console.log('Sending request to Roboflow:', {
      url: `${this.apiUrl}?api_key=${this.apiKey.substring(0, 4)}...`,
      base64Length: base64Image.length,
      base64Preview: base64Image.substring(0, 50) + '...'
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
      console.error('Roboflow API Error:', {
        status: response.status,
        statusText: response.statusText,
        errorText,
        apiUrl: this.apiUrl,
        hasApiKey: !!this.apiKey
      });
      throw new Error(`Roboflow API error: ${response.status} - ${errorText || response.statusText}`);
    }

    return await response.json();
  }

  async detectFromBase64(base64Image: string): Promise<BackendResponse> {
    const response = await fetch(`${this.apiUrl}?api_key=${this.apiKey}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: base64Image,
    });

    if (!response.ok) {
      throw new Error(`Roboflow API error: ${response.statusText}`);
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
