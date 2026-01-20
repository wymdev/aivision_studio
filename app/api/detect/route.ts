import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();

        // Get config from server environment variables
        const apiUrl = process.env.BACKEND_API_URL || process.env.NEXT_PUBLIC_BACKEND_API_URL || 'https://aicountingapi.xynotechmm.online/api/v1/prediction';
        // Remove quotes if present in env var to handle various .env parsers
        let apiKey = process.env.BACKEND_API_KEY || process.env.NEXT_PUBLIC_BACKEND_API_KEY || 'kspoef0230043290234naslkfoi@!$wrew';
        if (apiKey.startsWith("'") && apiKey.endsWith("'")) {
            apiKey = apiKey.slice(1, -1);
        }

        // Log configuration (safely)
        console.log("Proxying request to:", apiUrl);
        console.log("Using API Key (len):", apiKey?.length);

        // Forward the request to the external API
        const response = await fetch(apiUrl, {
            method: "POST",
            headers: {
                "X-API-Key": apiKey,
            },
            // When using fetch with FormData, do not set Content-Type header manually; 
            // let the browser/runtime set the boundary.
            // However, we need to pass the incoming formData directly? 
            // Next.js FormData might need reconversion.
            body: formData,
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error("Upstream API Error:", response.status, errorText);
            return NextResponse.json(
                { error: `Upstream API error: ${response.status}`, details: errorText },
                { status: response.status }
            );
        }

        const data = await response.json();
        return NextResponse.json(data);

    } catch (error) {
        console.error("Proxy Error:", error);
        return NextResponse.json(
            { error: "Internal Server Error", details: error instanceof Error ? error.message : String(error) },
            { status: 500 }
        );
    }
}
