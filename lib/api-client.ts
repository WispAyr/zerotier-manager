// Client-side API helpers for fetching from our proxy routes

export class ApiError extends Error {
    status: number;
    constructor(message: string, status: number) {
        super(message);
        this.status = status;
    }
}

// ─── Central API helpers ─────────────────────────────────────────────

async function centralFetch(path: string, token: string, options?: RequestInit) {
    const res = await fetch(`/api/central/${path}`, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            'x-zt-token': token,
            ...(options?.headers || {}),
        },
    });
    if (!res.ok) {
        const text = await res.text().catch(() => res.statusText);
        throw new ApiError(text, res.status);
    }
    if (res.status === 204) return null;
    return res.json();
}

export const centralApi = {
    listNetworks: (token: string) => centralFetch('network', token),
    getNetwork: (token: string, id: string) => centralFetch(`network/${id}`, token),
    createNetwork: (token: string, config: Record<string, unknown>) =>
        centralFetch('network', token, { method: 'POST', body: JSON.stringify({ config }) }),
    updateNetwork: (token: string, id: string, data: Record<string, unknown>) =>
        centralFetch(`network/${id}`, token, { method: 'POST', body: JSON.stringify(data) }),
    deleteNetwork: (token: string, id: string) =>
        centralFetch(`network/${id}`, token, { method: 'DELETE' }),
    listMembers: (token: string, networkId: string) =>
        centralFetch(`network/${networkId}/member`, token),
    getMember: (token: string, networkId: string, memberId: string) =>
        centralFetch(`network/${networkId}/member/${memberId}`, token),
    updateMember: (token: string, networkId: string, memberId: string, data: Record<string, unknown>) =>
        centralFetch(`network/${networkId}/member/${memberId}`, token, { method: 'POST', body: JSON.stringify(data) }),
    deleteMember: (token: string, networkId: string, memberId: string) =>
        centralFetch(`network/${networkId}/member/${memberId}`, token, { method: 'DELETE' }),
    getStatus: (token: string) => centralFetch('status', token),
    getSelf: (token: string) => centralFetch('user/self', token),
};

// ─── Service API helpers ─────────────────────────────────────────────

async function serviceFetch(path: string, options?: RequestInit) {
    const res = await fetch(`/api/service/${path}`, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...(options?.headers || {}),
        },
    });
    if (!res.ok) {
        const text = await res.text().catch(() => res.statusText);
        throw new ApiError(text, res.status);
    }
    if (res.status === 204) return null;
    return res.json();
}

export const serviceApi = {
    getStatus: () => serviceFetch('status'),
    getNetworks: () => serviceFetch('network'),
    getNetwork: (id: string) => serviceFetch(`network/${id}`),
    joinNetwork: (id: string) => serviceFetch(`network/${id}`, { method: 'POST', body: '{}' }),
    leaveNetwork: (id: string) => serviceFetch(`network/${id}`, { method: 'DELETE' }),
    getPeers: () => serviceFetch('peer'),
    getPeer: (id: string) => serviceFetch(`peer/${id}`),
};

// ─── Diagnostics helpers ─────────────────────────────────────────────

export async function runDiagnostics(token?: string) {
    const url = token ? `/api/diagnostics?token=${encodeURIComponent(token)}` : '/api/diagnostics';
    const res = await fetch(url);
    if (!res.ok) throw new ApiError(await res.text(), res.status);
    return res.json();
}

// ─── Token management ────────────────────────────────────────────────

const TOKEN_KEY = 'zt-central-token';

export function getCentralToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(TOKEN_KEY);
}

export function setCentralToken(token: string): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(TOKEN_KEY, token);
}

export function clearCentralToken(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(TOKEN_KEY);
}
