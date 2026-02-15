// Audit Log — tracks admin actions with localStorage persistence

export interface AuditEntry {
    id: string;
    timestamp: number;
    action: AuditAction;
    category: 'network' | 'member' | 'rules' | 'dns' | 'device' | 'settings';
    description: string;
    details?: Record<string, unknown>;
}

export type AuditAction =
    | 'network_create'
    | 'network_delete'
    | 'network_update'
    | 'member_authorize'
    | 'member_deauthorize'
    | 'member_remove'
    | 'member_update'
    | 'rules_update'
    | 'dns_update'
    | 'device_tag'
    | 'device_trust'
    | 'device_remove'
    | 'token_update'
    | 'token_clear'
    | 'data_clear'
    | 'network_nudge'
    | 'member_nudge'
    | 'peer_refresh';

const STORAGE_KEY = 'zt-audit-log';
const MAX_ENTRIES = 500;

export function getAuditLog(): AuditEntry[] {
    if (typeof window === 'undefined') return [];
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
}

export function logAction(
    action: AuditAction,
    category: AuditEntry['category'],
    description: string,
    details?: Record<string, unknown>
): AuditEntry {
    const entry: AuditEntry = {
        id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        timestamp: Date.now(),
        action,
        category,
        description,
        details,
    };

    const entries = getAuditLog();
    entries.push(entry);
    // Keep max entries
    const trimmed = entries.slice(-MAX_ENTRIES);
    if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
    }
    return entry;
}

export function clearAuditLog(): void {
    if (typeof window !== 'undefined') {
        localStorage.removeItem(STORAGE_KEY);
    }
}

export function exportAuditLog(): string {
    return JSON.stringify(getAuditLog(), null, 2);
}

export const actionLabels: Record<AuditAction, string> = {
    network_create: 'Network Created',
    network_delete: 'Network Deleted',
    network_update: 'Network Updated',
    member_authorize: 'Member Authorized',
    member_deauthorize: 'Member Deauthorized',
    member_remove: 'Member Removed',
    member_update: 'Member Updated',
    rules_update: 'Flow Rules Updated',
    dns_update: 'DNS Updated',
    device_tag: 'Device Tagged',
    device_trust: 'Device Trust Changed',
    device_remove: 'Device Removed',
    token_update: 'API Token Updated',
    token_clear: 'API Token Cleared',
    data_clear: 'Data Cleared',
    network_nudge: 'Network Nudged',
    member_nudge: 'Member Nudged',
    peer_refresh: 'Peers Refreshed',
};

export const categoryIcons: Record<AuditEntry['category'], string> = {
    network: '🌐',
    member: '👥',
    rules: '📋',
    dns: '🌍',
    device: '🏷️',
    settings: '⚙️',
};
