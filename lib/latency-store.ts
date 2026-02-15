// Latency history store — persists per-peer latency samples in localStorage

export interface LatencySample {
    timestamp: number;
    latency: number;
}

export interface PeerLatencyHistory {
    nodeId: string;
    samples: LatencySample[];
}

const STORAGE_KEY = 'zt-latency-history';
const MAX_SAMPLES_PER_PEER = 200; // ~10 min at 3s intervals
const MAX_PEERS = 50;

export function getLatencyHistory(): PeerLatencyHistory[] {
    if (typeof window === 'undefined') return [];
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
}

export function recordLatency(nodeId: string, latency: number): void {
    if (typeof window === 'undefined') return;
    const history = getLatencyHistory();
    let peer = history.find(p => p.nodeId === nodeId);

    if (!peer) {
        if (history.length >= MAX_PEERS) {
            // Remove peer with fewest samples
            history.sort((a, b) => a.samples.length - b.samples.length);
            history.shift();
        }
        peer = { nodeId, samples: [] };
        history.push(peer);
    }

    peer.samples.push({ timestamp: Date.now(), latency });
    // Trim to max samples
    if (peer.samples.length > MAX_SAMPLES_PER_PEER) {
        peer.samples = peer.samples.slice(-MAX_SAMPLES_PER_PEER);
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
}

export function getPeerLatencyHistory(nodeId: string): LatencySample[] {
    const history = getLatencyHistory();
    return history.find(p => p.nodeId === nodeId)?.samples || [];
}

export function clearLatencyHistory(): void {
    if (typeof window !== 'undefined') {
        localStorage.removeItem(STORAGE_KEY);
    }
}

export function getLatencyStats(nodeId: string): { avg: number; min: number; max: number; current: number } | null {
    const samples = getPeerLatencyHistory(nodeId);
    if (samples.length === 0) return null;

    const latencies = samples.map(s => s.latency);
    return {
        avg: Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length),
        min: Math.min(...latencies),
        max: Math.max(...latencies),
        current: latencies[latencies.length - 1],
    };
}
