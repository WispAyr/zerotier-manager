import { NextRequest, NextResponse } from 'next/server';

const CENTRAL_BASE = 'https://api.zerotier.com/api/v1';

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
    const token = request.headers.get('x-zt-token');
    if (!token) {
        return NextResponse.json({ error: 'Missing x-zt-token header' }, { status: 401 });
    }

    const path = '/' + params.path.join('/');
    const url = `${CENTRAL_BASE}${path}`;

    try {
        const fetchOptions: RequestInit = {
            method: request.method,
            headers: {
                'Authorization': `token ${token}`,
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
            { error: err instanceof Error ? err.message : 'Proxy error' },
            { status: 502 }
        );
    }
}
