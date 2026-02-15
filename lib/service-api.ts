// ZeroTier Local Service API — Typed Client
// Base: http://localhost:9993
// Auth: X-ZT1-Auth header with token from authtoken.secret

import { readFile } from 'fs/promises';
import { join } from 'path';
import { homedir } from 'os';

// ─── Types ───────────────────────────────────────────────────────────

export interface ServiceStatus {
    address: string;
    clock: number;
    config: {
        settings: {
            allowTcpFallbackRelay: boolean;
            portMappingEnabled: boolean;
            primaryPort: number;
        };
    };
    online: boolean;
    planetWorldId: number;
    planetWorldTimestamp: number;
    publicIdentity: string;
    tcpFallbackActive: boolean;
    version: string;
    versionBuild: number;
    versionMajor: number;
    versionMinor: number;
    versionRev: number;
}

export interface ServiceNetwork {
    id: string;
    nwid: string;
    mac: string;
    name: string;
    status: string;
    type: string;
    mtu: number;
    dhcp: boolean;
    bridge: boolean;
    broadcastEnabled: boolean;
    portError: number;
    netconfRevision: number;
    assignedAddresses: string[];
    routes: { target: string; via: string | null; flags: number; metric: number }[];
    portDeviceName: string;
    allowManaged: boolean;
    allowGlobal: boolean;
    allowDefault: boolean;
    allowDNS: boolean;
    dns: { domain: string; servers: string[] };
}

export interface ServicePeer {
    address: string;
    isBonded: boolean;
    latency: number;
    paths: ServicePath[];
    role: 'LEAF' | 'PLANET' | 'MOON';
    version: string;
    versionMajor: number;
    versionMinor: number;
    versionRev: number;
}

export interface ServicePath {
    active: boolean;
    address: string;
    expired: boolean;
    lastReceive: number;
    lastSend: number;
    preferred: boolean;
    trustedPathId: number;
}

export interface ControllerStatus {
    controller: boolean;
    apiVersion: number;
    clock: number;
}

export interface ControllerNetwork {
    id: string;
    nwid: string;
    name: string;
    creationTime: number;
    private: boolean;
    enableBroadcast: boolean;
    v4AssignMode: Record<string, boolean>;
    v6AssignMode: Record<string, boolean>;
    multicastLimit: number;
    routes: { target: string; via: string | null }[];
    ipAssignmentPools: { ipRangeStart: string; ipRangeEnd: string }[];
    rules: Record<string, unknown>[];
    mtu: number;
    dns: { domain: string; servers: string[] };
    ssoEnabled: boolean;
    objtype: string;
    revision: number;
    authorizedMemberCount: number;
    totalMemberCount: number;
}

export interface ControllerMember {
    id: string;
    nwid: string;
    address: string;
    authorized: boolean;
    activeBridge: boolean;
    identity: string;
    ipAssignments: string[];
    revision: number;
    noAutoAssignIps: boolean;
    creationTime: number;
    objtype: string;
}

// ─── Auth Token ──────────────────────────────────────────────────────

let cachedToken: string | null = null;

export async function getAuthToken(): Promise<string> {
    if (cachedToken) return cachedToken;
    const tokenPath = join(
        homedir(),
        'Library',
        'Application Support',
        'ZeroTier',
        'One',
        'authtoken.secret'
    );
    try {
        cachedToken = (await readFile(tokenPath, 'utf-8')).trim();
        return cachedToken;
    } catch {
        // Try alternate macOS path
        const altPath = join(homedir(), 'Library', 'Application Support', 'ZeroTier', 'authtoken.secret');
        try {
            cachedToken = (await readFile(altPath, 'utf-8')).trim();
            return cachedToken;
        } catch {
            throw new Error(
                `Cannot read ZeroTier auth token. Tried:\n  ${tokenPath}\n  ${altPath}\nMake sure ZeroTier is installed and running.`
            );
        }
    }
}

// ─── Client ──────────────────────────────────────────────────────────

const SERVICE_BASE = 'http://localhost:9993';

async function serviceFetch<T>(
    path: string,
    options: RequestInit = {}
): Promise<T> {
    const token = await getAuthToken();
    const res = await fetch(`${SERVICE_BASE}${path}`, {
        ...options,
        headers: {
            'X-ZT1-Auth': token,
            'Content-Type': 'application/json',
            ...options.headers,
        },
    });
    if (!res.ok) {
        const body = await res.text().catch(() => '');
        throw new Error(`Service API ${res.status}: ${res.statusText} — ${body}`);
    }
    if (res.status === 204) return {} as T;
    return res.json();
}

// ─── Status ──────────────────────────────────────────────────────────

export async function getServiceStatus(): Promise<ServiceStatus> {
    return serviceFetch('/status');
}

// ─── Networks (joined) ───────────────────────────────────────────────

export async function getJoinedNetworks(): Promise<ServiceNetwork[]> {
    return serviceFetch('/network');
}

export async function getJoinedNetwork(networkId: string): Promise<ServiceNetwork> {
    return serviceFetch(`/network/${networkId}`);
}

export async function joinNetwork(
    networkId: string,
    config?: { allowManaged?: boolean; allowGlobal?: boolean; allowDefault?: boolean; allowDNS?: boolean }
): Promise<ServiceNetwork> {
    return serviceFetch(`/network/${networkId}`, {
        method: 'POST',
        body: JSON.stringify(config || {}),
    });
}

export async function leaveNetwork(networkId: string): Promise<void> {
    await serviceFetch(`/network/${networkId}`, { method: 'DELETE' });
}

// ─── Peers ───────────────────────────────────────────────────────────

export async function getPeers(): Promise<ServicePeer[]> {
    return serviceFetch('/peer');
}

export async function getPeer(peerId: string): Promise<ServicePeer> {
    return serviceFetch(`/peer/${peerId}`);
}

// ─── Controller ──────────────────────────────────────────────────────

export async function getControllerStatus(): Promise<ControllerStatus> {
    return serviceFetch('/controller');
}

export async function getControllerNetworks(): Promise<string[]> {
    return serviceFetch('/controller/network');
}

export async function getControllerNetwork(networkId: string): Promise<ControllerNetwork> {
    return serviceFetch(`/controller/network/${networkId}`);
}

export async function createOrUpdateControllerNetwork(
    networkId: string,
    config: Partial<ControllerNetwork>
): Promise<ControllerNetwork> {
    return serviceFetch(`/controller/network/${networkId}`, {
        method: 'POST',
        body: JSON.stringify(config),
    });
}

export async function generateControllerNetworkId(): Promise<ControllerNetwork> {
    return serviceFetch(`/controller/network/0000000000______`, {
        method: 'POST',
        body: JSON.stringify({}),
    });
}

export async function getControllerNetworkMembers(
    networkId: string
): Promise<Record<string, number>> {
    return serviceFetch(`/controller/network/${networkId}/member`);
}

export async function getControllerNetworkMember(
    networkId: string,
    memberId: string
): Promise<ControllerMember> {
    return serviceFetch(`/controller/network/${networkId}/member/${memberId}`);
}
