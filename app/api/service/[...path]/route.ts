import { NextRequest, NextResponse } from 'next/server';
import { getAuthToken } from '@/lib/service-api';

const SERVICE_BASE = 'http://localhost:9993';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ path: string[] }> }
) {
    return proxyRequest(request, await params);
}

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ path: string[] }> }
) {
    return proxyRequest(request, await params);
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ path: string[] }> }
) {
    return proxyRequest(request, await params);
}

async function proxyRequest(
    request: NextRequest,
    params: { path: string[] }
) {
    let token: string;
    try {
        token = await getAuthToken();
    } catch (err) {
        return NextResponse.json(
            { error: err instanceof Error ? err.message : 'Cannot read auth token' },
            { status: 500 }
        );
    }

    const path = '/' + params.path.join('/');
    const url = `${SERVICE_BASE}${path}`;

    try {
        const fetchOptions: RequestInit = {
            method: request.method,
            headers: {
                'X-ZT1-Auth': token,
                'Content-Type': 'application/json',
            },
        };

        if (request.method !== 'GET' && request.method !== 'HEAD') {
            const body = await request.text();
            if (body) fetchOptions.body = body;
        }

        const res = await fetch(url, fetchOptions);
        const contentType = res.headers.get('content-type') || '';

        if (contentType.includes('application/json')) {
            const data = await res.json();
            return NextResponse.json(data, { status: res.status });
        }

        const text = await res.text();
        return new NextResponse(text, { status: res.status });
    } catch (err) {
        return NextResponse.json(
            { error: err instanceof Error ? err.message : 'Service proxy error' },
            { status: 502 }
        );
    }
}
