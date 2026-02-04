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
    const startTime = Date.now();
    const requestId = crypto.randomUUID();
    const predictionUrl = `${backendConfig.apiBaseUrl}${backendConfig.endpoints.prediction}`;

    console.log(JSON.stringify({
        level: "info",
        message: "Starting object detection request",
        requestId,
        url: predictionUrl,
        timestamp: new Date().toISOString()
    }));

    try {
        // Get OAuth2 access token
        const accessToken = await authService.getToken();

        // Add required fields if not present
        if (!formData.has("confidence")) formData.append("confidence", "0.5");
        if (!formData.has("overlap")) formData.append("overlap", "0.5");

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
                console.log(JSON.stringify({
                    level: "warn",
                    message: "Token expired, retrying",
                    requestId,
                    retryCount: retryCount + 1
                }));
                authService.clearToken();
                return detectObjectsWithRetry(formData, retryCount + 1);
            }

            console.error(JSON.stringify({
                level: "error",
                message: "API request failed",
                requestId,
                status: response.status,
                error: errorText
            }));
            return { success: false, error: `API error: ${response.status} - ${errorText}` };
        }

        const result = await response.json();
        const duration = Date.now() - startTime;

        console.log(JSON.stringify({
            level: "info",
            message: "Object detection successful",
            requestId,
            durationMs: duration,
            success: result.success
        }));

        if (!result.success) {
            return { success: false, error: 'API returned success: false' };
        }

        if ('results' in result.data) {
            return { success: true, data: result.data.results };
        } else {
            return { success: true, data: result.data };
        }
    } catch (error) {
        console.error(JSON.stringify({
            level: "error",
            message: "Server Action Exception",
            requestId,
            error: error instanceof Error ? error.message : String(error)
        }));
        throw error;
    }
}
