// Device Registry — Known device tagging and intrusion detection
// Stores device metadata in localStorage on the client side
// and provides intrusion detection for new/unknown devices

export interface KnownDevice {
    nodeId: string;
    nickname: string;
    tags: string[];
    firstSeen: number;
    lastSeen: number;
    trusted: boolean;
    notes: string;
    physicalAddress?: string;
    clientVersion?: string;
    networks: string[];
}

export interface IntrusionEvent {
    id: string;
    timestamp: number;
    type: 'new_device' | 'unauthorized_join' | 'ip_change' | 'version_change' | 'reappearance';
    severity: 'critical' | 'warning' | 'info';
    nodeId: string;
    networkId: string;
    networkName: string;
    description: string;
    acknowledged: boolean;
    deviceNickname?: string;
}

const STORAGE_KEY_DEVICES = 'zt-known-devices';
const STORAGE_KEY_EVENTS = 'zt-intrusion-events';

// ─── Device Registry ─────────────────────────────────────────────────

export function getKnownDevices(): KnownDevice[] {
    if (typeof window === 'undefined') return [];
    const data = localStorage.getItem(STORAGE_KEY_DEVICES);
    return data ? JSON.parse(data) : [];
}

export function saveKnownDevices(devices: KnownDevice[]): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_KEY_DEVICES, JSON.stringify(devices));
}

export function getKnownDevice(nodeId: string): KnownDevice | undefined {
    return getKnownDevices().find(d => d.nodeId === nodeId);
}

export function upsertKnownDevice(device: Partial<KnownDevice> & { nodeId: string }): KnownDevice {
    const devices = getKnownDevices();
    const idx = devices.findIndex(d => d.nodeId === device.nodeId);
    const now = Date.now();

    if (idx >= 0) {
        devices[idx] = { ...devices[idx], ...device, lastSeen: now };
        saveKnownDevices(devices);
        return devices[idx];
    } else {
        const newDevice: KnownDevice = {
            nodeId: device.nodeId,
            nickname: device.nickname || '',
            tags: device.tags || [],
            firstSeen: now,
            lastSeen: now,
            trusted: device.trusted || false,
            notes: device.notes || '',
            physicalAddress: device.physicalAddress,
            clientVersion: device.clientVersion,
            networks: device.networks || [],
        };
        devices.push(newDevice);
        saveKnownDevices(devices);
        return newDevice;
    }
}

export function removeKnownDevice(nodeId: string): void {
    const devices = getKnownDevices().filter(d => d.nodeId !== nodeId);
    saveKnownDevices(devices);
}

export function addDeviceTag(nodeId: string, tag: string): void {
    const devices = getKnownDevices();
    const device = devices.find(d => d.nodeId === nodeId);
    if (device && !device.tags.includes(tag)) {
        device.tags.push(tag);
        saveKnownDevices(devices);
    }
}

export function removeDeviceTag(nodeId: string, tag: string): void {
    const devices = getKnownDevices();
    const device = devices.find(d => d.nodeId === nodeId);
    if (device) {
        device.tags = device.tags.filter(t => t !== tag);
        saveKnownDevices(devices);
    }
}

// ─── Intrusion Detection ─────────────────────────────────────────────

export function getIntrusionEvents(): IntrusionEvent[] {
    if (typeof window === 'undefined') return [];
    const data = localStorage.getItem(STORAGE_KEY_EVENTS);
    return data ? JSON.parse(data) : [];
}

export function saveIntrusionEvents(events: IntrusionEvent[]): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_KEY_EVENTS, JSON.stringify(events));
}

export function acknowledgeEvent(eventId: string): void {
    const events = getIntrusionEvents();
    const event = events.find(e => e.id === eventId);
    if (event) {
        event.acknowledged = true;
        saveIntrusionEvents(events);
    }
}

export function clearAcknowledgedEvents(): void {
    const events = getIntrusionEvents().filter(e => !e.acknowledged);
    saveIntrusionEvents(events);
}

export interface MemberSnapshot {
    nodeId: string;
    networkId: string;
    networkName: string;
    authorized: boolean;
    physicalAddress: string;
    clientVersion: string;
    ipAssignments: string[];
    lastOnline: number;
    name: string;
}

export function detectIntrusions(currentMembers: MemberSnapshot[]): IntrusionEvent[] {
    const knownDevices = getKnownDevices();
    const existingEvents = getIntrusionEvents();
    const newEvents: IntrusionEvent[] = [];
    const knownIds = new Set(knownDevices.map(d => d.nodeId));
    const now = Date.now();

    for (const member of currentMembers) {
        const known = knownDevices.find(d => d.nodeId === member.nodeId);

        // New device detection
        if (!knownIds.has(member.nodeId)) {
            const existingEvent = existingEvents.find(
                e => e.nodeId === member.nodeId && e.type === 'new_device' && e.networkId === member.networkId
            );
            if (!existingEvent) {
                newEvents.push({
                    id: `evt-${now}-${member.nodeId}-${member.networkId}`,
                    timestamp: now,
                    type: 'new_device',
                    severity: 'warning',
                    nodeId: member.nodeId,
                    networkId: member.networkId,
                    networkName: member.networkName,
                    description: `New unknown device "${member.name || member.nodeId}" joined network "${member.networkName}". Physical address: ${member.physicalAddress || 'unknown'}. Client: ${member.clientVersion || 'unknown'}.`,
                    acknowledged: false,
                });
            }
        }

        // Unauthorized join attempt
        if (!member.authorized && known) {
            const existingEvent = existingEvents.find(
                e => e.nodeId === member.nodeId && e.type === 'unauthorized_join' && e.networkId === member.networkId
                    && (now - e.timestamp) < 3600000
            );
            if (!existingEvent) {
                newEvents.push({
                    id: `evt-${now}-${member.nodeId}-unauth`,
                    timestamp: now,
                    type: 'unauthorized_join',
                    severity: known.trusted ? 'info' : 'warning',
                    nodeId: member.nodeId,
                    networkId: member.networkId,
                    networkName: member.networkName,
                    description: `Known device "${known.nickname || member.nodeId}" is not authorized on "${member.networkName}".`,
                    acknowledged: false,
                    deviceNickname: known.nickname,
                });
            }
        }

        // Physical address change detection
        if (known && member.physicalAddress && known.physicalAddress
            && member.physicalAddress !== known.physicalAddress) {
            const existingEvent = existingEvents.find(
                e => e.nodeId === member.nodeId && e.type === 'ip_change' && (now - e.timestamp) < 3600000
            );
            if (!existingEvent) {
                newEvents.push({
                    id: `evt-${now}-${member.nodeId}-ipchange`,
                    timestamp: now,
                    type: 'ip_change',
                    severity: known.trusted ? 'info' : 'warning',
                    nodeId: member.nodeId,
                    networkId: member.networkId,
                    networkName: member.networkName,
                    description: `Device "${known.nickname || member.nodeId}" changed physical address from ${known.physicalAddress} to ${member.physicalAddress}.`,
                    acknowledged: false,
                    deviceNickname: known.nickname,
                });
            }
        }

        // Client version change
        if (known && member.clientVersion && known.clientVersion
            && member.clientVersion !== known.clientVersion) {
            const existingEvent = existingEvents.find(
                e => e.nodeId === member.nodeId && e.type === 'version_change' && (now - e.timestamp) < 86400000
            );
            if (!existingEvent) {
                newEvents.push({
                    id: `evt-${now}-${member.nodeId}-verchange`,
                    timestamp: now,
                    type: 'version_change',
                    severity: 'info',
                    nodeId: member.nodeId,
                    networkId: member.networkId,
                    networkName: member.networkName,
                    description: `Device "${known.nickname || member.nodeId}" changed client version from ${known.clientVersion} to ${member.clientVersion}.`,
                    acknowledged: false,
                    deviceNickname: known.nickname,
                });
            }
        }

        // Update known device info
        if (known) {
            upsertKnownDevice({
                nodeId: member.nodeId,
                physicalAddress: member.physicalAddress || known.physicalAddress,
                clientVersion: member.clientVersion || known.clientVersion,
                networks: Array.from(new Set([...known.networks, member.networkId])),
            });
        }
    }

    if (newEvents.length > 0) {
        const allEvents = [...existingEvents, ...newEvents];
        // Keep max 500 events
        const trimmed = allEvents.slice(-500);
        saveIntrusionEvents(trimmed);
    }

    return newEvents;
}

// ─── Predefined Tags ─────────────────────────────────────────────────

export const suggestedTags = [
    { label: 'Server', color: '#6366f1' },
    { label: 'Desktop', color: '#3b82f6' },
    { label: 'Laptop', color: '#06b6d4' },
    { label: 'Mobile', color: '#10b981' },
    { label: 'IoT', color: '#f59e0b' },
    { label: 'Router', color: '#ef4444' },
    { label: 'Bridge', color: '#8b5cf6' },
    { label: 'VM', color: '#ec4899' },
    { label: 'Container', color: '#14b8a6' },
    { label: 'Production', color: '#dc2626' },
    { label: 'Staging', color: '#ea580c' },
    { label: 'Development', color: '#65a30d' },
    { label: 'Critical', color: '#b91c1c' },
    { label: 'Trusted', color: '#059669' },
    { label: 'Guest', color: '#9ca3af' },
];
