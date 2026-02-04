import { NextRequest, NextResponse } from "next/server";

const API_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL || "https://aicountingapi.xynotechmm.online/api/v1";

async function handler(
    request: NextRequest,
    { params }: { params: Promise<{ path: string[] }> }
) {
    try {
        const { path } = await params;
        const pathStr = path.join("/");

        // Construct target URL
        const searchParams = request.nextUrl.searchParams.toString();
        const targetUrl = `${API_URL}/${pathStr}${searchParams ? `?${searchParams}` : ""}`;

        // console.log(`[Proxy] ${request.method} -> ${targetUrl}`);

        // Prepare headers
        const headers = new Headers(request.headers);
        headers.delete("host"); // Remove host header to avoid conflicts
        headers.delete("connection");
        // headers.set("host", new URL(API_URL).host); 

        // Forward request
        const response = await fetch(targetUrl, {
            method: request.method,
            headers: headers,
            body: (request.method === 'GET' || request.method === 'HEAD') ? undefined : request.body,
            // @ts-ignore - duplex is optional in standard types but required for node fetch streaming
            duplex: 'half'
        });

        // Prepare response headers
        const responseHeaders = new Headers(response.headers);
        responseHeaders.delete("content-encoding"); // Let server handle compression
        responseHeaders.delete("content-length");

        return new NextResponse(response.body, {
            status: response.status,
            statusText: response.statusText,
            headers: responseHeaders,
        });
    } catch (error) {
        console.error("[Proxy Error]", error);
        return NextResponse.json(
            { error: "Proxy Request Failed", details: error instanceof Error ? error.message : String(error) },
            { status: 500 }
        );
    }
}

export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const DELETE = handler;
export const PATCH = handler;
