'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Sidebar from '@/components/Sidebar';
import { serviceApi } from '@/lib/api-client';

interface DataPoint {
    time: number;
    peers: number;
    direct: number;
    relayed: number;
    avgLatency: number;
}

export default function TrafficPage() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [history, setHistory] = useState<DataPoint[]>([]);
    const [currentPeers, setCurrentPeers] = useState<Record<string, unknown>[]>([]);
    const historyRef = useRef<DataPoint[]>([]);

    const fetchData = useCallback(async () => {
        try {
            const peers = await serviceApi.getPeers();
            const peerList = Array.isArray(peers) ? peers : [];
            setCurrentPeers(peerList);

            const leafPeers = peerList.filter(p => p.role === 'LEAF');
            const direct = leafPeers.filter(p => ((p.paths as unknown[])?.length || 0) > 0);
            const relayed = leafPeers.filter(p => !((p.paths as unknown[])?.length));
            const latencies = leafPeers.map(p => p.latency as number).filter(l => l >= 0);
            const avgLatency = latencies.length > 0 ? latencies.reduce((a, b) => a + b, 0) / latencies.length : 0;

            const point: DataPoint = {
                time: Date.now(),
                peers: leafPeers.length,
                direct: direct.length,
                relayed: relayed.length,
                avgLatency: Math.round(avgLatency),
            };

            historyRef.current = [...historyRef.current.slice(-59), point];
            setHistory([...historyRef.current]);
        } catch {
            /* Service may not be running */
        }
    }, []);

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 3000);
        return () => clearInterval(interval);
    }, [fetchData]);

    // Draw chart
    useEffect(() => {
        if (!canvasRef.current || history.length === 0) return;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const dpr = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        ctx.scale(dpr, dpr);

        const w = rect.width;
        const h = rect.height;
        const padding = { top: 20, right: 20, bottom: 30, left: 50 };
        const chartW = w - padding.left - padding.right;
        const chartH = h - padding.top - padding.bottom;

        ctx.clearRect(0, 0, w, h);

        // Grid lines
        const maxLatency = Math.max(100, ...history.map(d => d.avgLatency));
        for (let i = 0; i <= 4; i++) {
            const y = padding.top + (chartH / 4) * i;
            ctx.beginPath();
            ctx.moveTo(padding.left, y);
            ctx.lineTo(w - padding.right, y);
            ctx.strokeStyle = 'rgba(255,255,255,0.04)';
            ctx.stroke();

            ctx.font = '10px Inter, sans-serif';
            ctx.fillStyle = 'rgba(107,114,128,0.6)';
            ctx.textAlign = 'right';
            ctx.fillText(`${Math.round(maxLatency - (maxLatency / 4) * i)}ms`, padding.left - 8, y + 3);
        }

        // Time labels
        if (history.length > 1) {
            const startTime = history[0].time;
            const endTime = history[history.length - 1].time;
            ctx.font = '10px Inter, sans-serif';
            ctx.fillStyle = 'rgba(107,114,128,0.5)';
            ctx.textAlign = 'center';
            ctx.fillText(new Date(startTime).toLocaleTimeString(), padding.left, h - 5);
            ctx.fillText(new Date(endTime).toLocaleTimeString(), w - padding.right, h - 5);
        }

        // Draw area fill for latency
        if (history.length > 1) {
            const step = chartW / (Math.max(history.length - 1, 1));

            // Latency area
            ctx.beginPath();
            ctx.moveTo(padding.left, padding.top + chartH);
            for (let i = 0; i < history.length; i++) {
                const x = padding.left + step * i;
                const y = padding.top + chartH - (history[i].avgLatency / maxLatency) * chartH;
                if (i === 0) ctx.lineTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.lineTo(padding.left + step * (history.length - 1), padding.top + chartH);
            ctx.closePath();

            const gradient = ctx.createLinearGradient(0, padding.top, 0, padding.top + chartH);
            gradient.addColorStop(0, 'rgba(139, 92, 246, 0.2)');
            gradient.addColorStop(1, 'rgba(139, 92, 246, 0.01)');
            ctx.fillStyle = gradient;
            ctx.fill();

            // Latency line
            ctx.beginPath();
            for (let i = 0; i < history.length; i++) {
                const x = padding.left + step * i;
                const y = padding.top + chartH - (history[i].avgLatency / maxLatency) * chartH;
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.strokeStyle = '#8b5cf6';
            ctx.lineWidth = 2;
            ctx.stroke();

            // Direct peers line (scaled to fit)
            const maxPeers = Math.max(1, ...history.map(d => d.peers));
            ctx.beginPath();
            for (let i = 0; i < history.length; i++) {
                const x = padding.left + step * i;
                const y = padding.top + chartH - (history[i].direct / maxPeers) * chartH * 0.8;
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.strokeStyle = '#10b981';
            ctx.lineWidth = 1.5;
            ctx.setLineDash([4, 3]);
            ctx.stroke();
            ctx.setLineDash([]);

            // Relayed peers line
            ctx.beginPath();
            for (let i = 0; i < history.length; i++) {
                const x = padding.left + step * i;
                const y = padding.top + chartH - (history[i].relayed / maxPeers) * chartH * 0.8;
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.strokeStyle = '#f59e0b';
            ctx.lineWidth = 1.5;
            ctx.setLineDash([4, 3]);
            ctx.stroke();
            ctx.setLineDash([]);
        }
    }, [history]);

    const latest = history[history.length - 1];
    const topLatencyPeers = currentPeers
        .filter(p => p.role === 'LEAF' && (p.latency as number) > 0)
        .sort((a, b) => (b.latency as number) - (a.latency as number))
        .slice(0, 5);

    return (
        <div className="app-layout">
            <Sidebar />
            <main className="main-content">
                <div className="page-container">
                    <div className="page-header">
                        <h2>Traffic Visualization</h2>
                        <p>Real-time network connectivity metrics and peer activity</p>
                    </div>

                    <div className="help-box">
                        <div className="help-title">💡 How to Read This</div>
                        This page shows real-time metrics sampled every 3 seconds. The <strong style={{ color: '#8b5cf6' }}>purple area</strong> is
                        average latency across all peers. <strong style={{ color: '#10b981' }}>Green dashed</strong> = direct peer count,
                        <strong style={{ color: '#f59e0b' }}> amber dashed</strong> = relayed peer count. Lower latency and more direct connections = better performance.
                    </div>

                    {latest && (
                        <div className="stat-grid">
                            <div className="stat-card accent-purple">
                                <div className="stat-icon">⏱️</div>
                                <div className="stat-value">{latest.avgLatency}ms</div>
                                <div className="stat-label">Avg Latency</div>
                            </div>
                            <div className="stat-card accent-green">
                                <div className="stat-icon">✅</div>
                                <div className="stat-value">{latest.direct}</div>
                                <div className="stat-label">Direct Peers</div>
                            </div>
                            <div className="stat-card accent-amber">
                                <div className="stat-icon">🔄</div>
                                <div className="stat-value">{latest.relayed}</div>
                                <div className="stat-label">Relayed Peers</div>
                            </div>
                            <div className="stat-card accent-blue">
                                <div className="stat-icon">📊</div>
                                <div className="stat-value">{history.length}</div>
                                <div className="stat-label">Samples</div>
                            </div>
                        </div>
                    )}

                    <div className="traffic-chart" style={{ marginBottom: 24 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                            <h3 style={{ fontSize: 15, fontWeight: 600 }}>Live Metrics (3s interval)</h3>
                            <div style={{ display: 'flex', gap: 16, fontSize: 12, color: 'var(--text-secondary)' }}>
                                <span><span style={{ color: '#8b5cf6' }}>━</span> Latency</span>
                                <span><span style={{ color: '#10b981' }}>┄</span> Direct</span>
                                <span><span style={{ color: '#f59e0b' }}>┄</span> Relayed</span>
                            </div>
                        </div>
                        <canvas ref={canvasRef} style={{ width: '100%', height: 280 }} />
                    </div>

                    {topLatencyPeers.length > 0 && (
                        <>
                            <div className="section-title">Highest Latency Peers</div>
                            <div className="table-container">
                                <table className="table">
                                    <thead><tr><th>Address</th><th>Latency</th><th>Connection</th><th>Version</th></tr></thead>
                                    <tbody>
                                        {topLatencyPeers.map(p => (
                                            <tr key={p.address as string}>
                                                <td style={{ fontFamily: 'var(--font-mono)' }}>{p.address as string}</td>
                                                <td>
                                                    <span className={`badge ${(p.latency as number) > 200 ? 'badge-red' : (p.latency as number) > 100 ? 'badge-amber' : 'badge-green'}`}>
                                                        {p.latency as number}ms
                                                    </span>
                                                </td>
                                                <td>
                                                    <span className={`badge ${(p.paths as unknown[])?.length ? 'badge-green' : 'badge-amber'}`}>
                                                        {(p.paths as unknown[])?.length ? 'Direct' : 'Relayed'}
                                                    </span>
                                                </td>
                                                <td>{p.version as string || '—'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </>
                    )}
                </div>
            </main>
        </div>
    );
}
