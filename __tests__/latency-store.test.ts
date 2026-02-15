import { describe, it, expect, beforeEach } from '@jest/globals';
import {
    recordLatency,
    getLatencyHistory,
    getPeerLatencyHistory,
    getLatencyStats,
    clearLatencyHistory,
} from '@/lib/latency-store';

describe('Latency Store', () => {
    beforeEach(() => {
        localStorage.clear();
    });

    it('should start with no history', () => {
        expect(getLatencyHistory()).toEqual([]);
    });

    it('should start with no per-peer history', () => {
        expect(getPeerLatencyHistory('peer1')).toEqual([]);
    });

    it('should record latency samples', () => {
        recordLatency('peer1', 42);
        recordLatency('peer1', 55);
        expect(getPeerLatencyHistory('peer1')).toHaveLength(2);
    });

    it('should store timestamp and value', () => {
        const before = Date.now();
        recordLatency('peer1', 100);
        const after = Date.now();
        const samples = getPeerLatencyHistory('peer1');
        expect(samples[0].latency).toBe(100);
        expect(samples[0].timestamp).toBeGreaterThanOrEqual(before);
        expect(samples[0].timestamp).toBeLessThanOrEqual(after);
    });

    it('should track multiple peers independently', () => {
        recordLatency('peerA', 10);
        recordLatency('peerA', 20);
        recordLatency('peerB', 30);
        expect(getPeerLatencyHistory('peerA')).toHaveLength(2);
        expect(getPeerLatencyHistory('peerB')).toHaveLength(1);
        expect(getLatencyHistory()).toHaveLength(2);
    });

    it('should compute statistics correctly', () => {
        recordLatency('peer1', 10);
        recordLatency('peer1', 20);
        recordLatency('peer1', 30);
        recordLatency('peer1', 40);
        const stats = getLatencyStats('peer1');
        expect(stats).not.toBeNull();
        expect(stats!.min).toBe(10);
        expect(stats!.max).toBe(40);
        expect(stats!.avg).toBe(25);
        expect(stats!.current).toBe(40);
    });

    it('should return null stats for unknown peer', () => {
        expect(getLatencyStats('unknown')).toBeNull();
    });

    it('should enforce max 200 samples per peer', () => {
        for (let i = 0; i < 220; i++) {
            recordLatency('peer1', i);
        }
        const samples = getPeerLatencyHistory('peer1');
        expect(samples.length).toBeLessThanOrEqual(200);
        expect(samples[0].latency).toBe(20);
    });

    it('should enforce max 50 peers', () => {
        for (let i = 0; i < 55; i++) {
            recordLatency(`peer${i}`, i);
        }
        expect(getLatencyHistory().length).toBeLessThanOrEqual(50);
    });

    it('should clear all history', () => {
        recordLatency('peer1', 10);
        recordLatency('peer2', 20);
        clearLatencyHistory();
        expect(getLatencyHistory()).toEqual([]);
        expect(getPeerLatencyHistory('peer1')).toEqual([]);
    });

    it('should persist across reads', () => {
        recordLatency('peer1', 42);
        const h1 = getPeerLatencyHistory('peer1');
        const h2 = getPeerLatencyHistory('peer1');
        expect(h1).toEqual(h2);
    });
});
