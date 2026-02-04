'use server'

import { authService } from "@/services/auth.service";
import { backendConfig } from "@/config/backend.config";
import { AiCountingData } from "@/types/backend.types";

export async function detectObjectsAction(formData: FormData): Promise<{ success: boolean; data?: AiCountingData | AiCountingData[]; error?: string }> {
    try {
        return await detectObjectsWithRetry(formData);
    } catch (error) {
        console.error("Server Action Error:", error);
        return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
    }
}

async function detectObjectsWithRetry(formData: FormData, retryCount = 0): Promise<{ success: boolean; data?: AiCountingData | AiCountingData[]; error?: string }> {
    try {
        // Get OAuth2 access token
        const accessToken = await authService.getToken();

        // Add required fields if not present (though frontend should provide them)
        if (!formData.has("confidence")) formData.append("confidence", "0.5");
        if (!formData.has("overlap")) formData.append("overlap", "0.5");

        const predictionUrl = `${backendConfig.apiBaseUrl}${backendConfig.endpoints.prediction}`;

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
                console.log("Token expired or invalid in Server Action. Refreshing token and retrying...");
                authService.clearToken();
                return detectObjectsWithRetry(formData, retryCount + 1);
            }

            console.error('API Error Response:', response.status, errorText);
            return { success: false, error: `API error: ${response.status} - ${errorText}` };
        }

        const result = await response.json();

        if (!result.success) {
            return { success: false, error: 'API returned success: false' };
        }

        if ('results' in result.data) {
            return { success: true, data: result.data.results };
        } else {
            return { success: true, data: result.data };
        }
    } catch (error) {
        console.error("Error detecting objects:", error);
        throw error;
    }
}
