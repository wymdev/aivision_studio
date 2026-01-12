import { apiClient } from "@/lib/api-client";

export class ApiService {
  async healthCheck(): Promise<{ status: string }> {
    return apiClient.get("/health");
  }

  async getVersion(): Promise<{ version: string }> {
    return apiClient.get("/version");
  }
}

export const apiService = new ApiService();
