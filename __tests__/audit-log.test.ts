import { describe, it, expect, beforeEach } from '@jest/globals';
import {
    getAuditLog,
    logAction,
    clearAuditLog,
    exportAuditLog,
    actionLabels,
    categoryIcons,
} from '@/lib/audit-log';

describe('Audit Log', () => {
    beforeEach(() => {
        localStorage.clear();
    });

    it('should start with an empty log', () => {
        expect(getAuditLog()).toEqual([]);
    });

    it('should log an action', () => {
        logAction('network_create', 'network', 'Created test network');
        const log = getAuditLog();
        expect(log).toHaveLength(1);
        expect(log[0].action).toBe('network_create');
        expect(log[0].category).toBe('network');
        expect(log[0].description).toBe('Created test network');
        expect(log[0].id).toBeDefined();
        expect(log[0].timestamp).toBeDefined();
    });

    it('should log actions with details', () => {
        logAction('member_authorize', 'member', 'Authorized member X', { nodeId: 'abc123' });
        const log = getAuditLog();
        expect(log[0].details).toEqual({ nodeId: 'abc123' });
    });

    it('should append multiple actions', () => {
        logAction('network_create', 'network', 'Created A');
        logAction('network_delete', 'network', 'Deleted B');
        logAction('rules_update', 'rules', 'Updated rules');
        expect(getAuditLog()).toHaveLength(3);
    });

    it('should clear the log', () => {
        logAction('network_create', 'network', 'Created');
        logAction('network_delete', 'network', 'Deleted');
        clearAuditLog();
        expect(getAuditLog()).toEqual([]);
    });

    it('should export as JSON string', () => {
        logAction('dns_update', 'dns', 'Updated DNS');
        const exported = exportAuditLog();
        const parsed = JSON.parse(exported);
        expect(Array.isArray(parsed)).toBe(true);
        expect(parsed).toHaveLength(1);
        expect(parsed[0].action).toBe('dns_update');
    });

    it('should enforce rolling buffer of 500 entries', () => {
        for (let i = 0; i < 520; i++) {
            logAction('network_create', 'network', `Entry ${i}`);
        }
        const log = getAuditLog();
        expect(log.length).toBeLessThanOrEqual(500);
        expect(log[0].description).toBe('Entry 20');
    });

    it('should have labels for all action types', () => {
        expect(actionLabels.network_create).toBe('Network Created');
        expect(actionLabels.member_authorize).toBe('Member Authorized');
        expect(actionLabels.rules_update).toBe('Flow Rules Updated');
    });

    it('should have icons for all categories', () => {
        expect(categoryIcons.network).toBe('🌐');
        expect(categoryIcons.member).toBe('👥');
        expect(categoryIcons.rules).toBe('📋');
        expect(categoryIcons.dns).toBe('🌍');
        expect(categoryIcons.device).toBe('🏷️');
        expect(categoryIcons.settings).toBe('⚙️');
    });

    it('should persist across reads', () => {
        logAction('network_create', 'network', 'Persistent entry');
        const log1 = getAuditLog();
        const log2 = getAuditLog();
        expect(log1).toEqual(log2);
    });
});
