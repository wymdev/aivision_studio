import { apiClient } from "@/lib/api-client";

export abstract class BaseRepository<T> {
  protected endpoint: string;

  constructor(endpoint: string) {
    this.endpoint = endpoint;
  }

  async findAll(): Promise<T[]> {
    return apiClient.get<T[]>(this.endpoint);
  }

  async findById(id: string): Promise<T> {
    return apiClient.get<T>(`${this.endpoint}/${id}`);
  }

  async create(data: Partial<T>): Promise<T> {
    return apiClient.post<T>(this.endpoint, data);
  }

  async update(id: string, data: Partial<T>): Promise<T> {
    return apiClient.put<T>(`${this.endpoint}/${id}`, data);
  }

  async delete(id: string): Promise<void> {
    return apiClient.delete<void>(`${this.endpoint}/${id}`);
  }
}
