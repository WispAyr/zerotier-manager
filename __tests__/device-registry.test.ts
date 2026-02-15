import { describe, it, expect, beforeEach } from '@jest/globals';
import {
    getKnownDevices,
    upsertKnownDevice,
    removeKnownDevice,
    addDeviceTag,
    removeDeviceTag,
    getIntrusionEvents,
    acknowledgeEvent,
    clearAcknowledgedEvents,
    detectIntrusions,
    type MemberSnapshot,
} from '@/lib/device-registry';

describe('Device Registry', () => {
    beforeEach(() => {
        localStorage.clear();
    });

    it('should start with no known devices', () => {
        expect(getKnownDevices()).toEqual([]);
    });

    it('should upsert a new device', () => {
        const device = upsertKnownDevice({
            nodeId: 'abc123',
            nickname: 'Test Device',
        });
        expect(device.nodeId).toBe('abc123');
        expect(device.nickname).toBe('Test Device');
        expect(device.firstSeen).toBeDefined();
        expect(getKnownDevices()).toHaveLength(1);
    });

    it('should update existing device without losing data', () => {
        upsertKnownDevice({ nodeId: 'abc123', nickname: 'Original' });
        const updated = upsertKnownDevice({ nodeId: 'abc123', nickname: 'Updated' });
        expect(updated.nickname).toBe('Updated');
        expect(getKnownDevices()).toHaveLength(1);
    });

    it('should remove a device', () => {
        upsertKnownDevice({ nodeId: 'abc123' });
        upsertKnownDevice({ nodeId: 'def456' });
        removeKnownDevice('abc123');
        expect(getKnownDevices()).toHaveLength(1);
        expect(getKnownDevices()[0].nodeId).toBe('def456');
    });

    it('should add tags to a device', () => {
        upsertKnownDevice({ nodeId: 'abc123' });
        addDeviceTag('abc123', 'server');
        addDeviceTag('abc123', 'production');
        const devices = getKnownDevices();
        expect(devices[0].tags).toContain('server');
        expect(devices[0].tags).toContain('production');
    });

    it('should not add duplicate tags', () => {
        upsertKnownDevice({ nodeId: 'abc123' });
        addDeviceTag('abc123', 'server');
        addDeviceTag('abc123', 'server');
        const devices = getKnownDevices();
        expect(devices[0].tags.filter(t => t === 'server')).toHaveLength(1);
    });

    it('should remove tags from a device', () => {
        upsertKnownDevice({ nodeId: 'abc123' });
        addDeviceTag('abc123', 'server');
        addDeviceTag('abc123', 'production');
        removeDeviceTag('abc123', 'server');
        const devices = getKnownDevices();
        expect(devices[0].tags).not.toContain('server');
        expect(devices[0].tags).toContain('production');
    });
});

describe('Intrusion Detection', () => {
    beforeEach(() => {
        localStorage.clear();
    });

    it('should start with no events', () => {
        expect(getIntrusionEvents()).toEqual([]);
    });

    it('should detect new devices', () => {
        const members: MemberSnapshot[] = [
            { nodeId: 'node1', networkId: 'net1', networkName: 'Test', authorized: true, physicalAddress: '1.2.3.4', clientVersion: '1.0', ipAssignments: ['10.0.0.1'], lastOnline: Date.now(), name: 'Device 1' },
        ];
        const events = detectIntrusions(members);
        // First time seeing devices generates new_device events
        const newDeviceEvents = events.filter(e => e.type === 'new_device');
        expect(newDeviceEvents.length).toBeGreaterThanOrEqual(1);
    });

    it('should acknowledge events', () => {
        const members: MemberSnapshot[] = [
            { nodeId: 'node1', networkId: 'net1', networkName: 'Test', authorized: true, physicalAddress: '1.2.3.4', clientVersion: '1.0', ipAssignments: ['10.0.0.1'], lastOnline: Date.now(), name: 'Device' },
        ];
        detectIntrusions(members);
        const events = getIntrusionEvents();
        if (events.length > 0) {
            acknowledgeEvent(events[0].id);
            const updated = getIntrusionEvents();
            expect(updated[0].acknowledged).toBe(true);
        }
    });

    it('should clear acknowledged events', () => {
        const members: MemberSnapshot[] = [
            { nodeId: 'device1', networkId: 'net1', networkName: 'Test', authorized: true, physicalAddress: '9.9.9.9', clientVersion: '1.0', ipAssignments: ['10.0.0.2'], lastOnline: Date.now(), name: '' },
        ];
        detectIntrusions(members);
        const events = getIntrusionEvents();
        if (events.length > 0) {
            acknowledgeEvent(events[0].id);
            clearAcknowledgedEvents();
            const remaining = getIntrusionEvents();
            expect(remaining.every(e => !e.acknowledged)).toBe(true);
        }
    });
});
