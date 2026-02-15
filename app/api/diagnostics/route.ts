import { NextRequest, NextResponse } from 'next/server';
import { runDiagnostics } from '@/lib/diagnostics';

export async function GET(request: NextRequest) {
    const token = request.headers.get('x-zt-token') || undefined;

    try {
        const report = await runDiagnostics(token);
        return NextResponse.json(report);
    } catch (err) {
        return NextResponse.json(
            { error: err instanceof Error ? err.message : 'Diagnostics failed' },
            { status: 500 }
        );
    }
}
