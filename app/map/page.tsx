'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Sidebar from '@/components/Sidebar';
import { serviceApi, centralApi, getCentralToken } from '@/lib/api-client';
import { getKnownDevice } from '@/lib/device-registry';

interface MapNode {
    id: string;
    label: string;
    role: 'self' | 'leaf' | 'planet' | 'moon';
    x: number;
    y: number;
    vx: number;
    vy: number;
    latency: number;
    isDirect: boolean;
    tags: string[];
}

interface MapEdge {
    from: string;
    to: string;
    isDirect: boolean;
    latency: number;
}

export default function MapPage() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [nodes, setNodes] = useState<MapNode[]>([]);
    const [edges, setEdges] = useState<MapEdge[]>([]);
    const [hoveredNode, setHoveredNode] = useState<MapNode | null>(null);
    const animFrameRef = useRef<number>(0);
    const mouseRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

    const fetchData = useCallback(async () => {
        const mapNodes: MapNode[] = [];
        const mapEdges: MapEdge[] = [];

        try {
            const status = await serviceApi.getStatus();
            const selfId = status?.address as string || 'self';
            mapNodes.push({
                id: selfId,
                label: 'This Node',
                role: 'self',
                x: 0,
                y: 0,
                vx: 0,
                vy: 0,
                latency: 0,
                isDirect: true,
                tags: [],
            });

            const peers = await serviceApi.getPeers();
            if (Array.isArray(peers)) {
                const angle = (2 * Math.PI) / Math.max(peers.length, 1);
                peers.forEach((p, i) => {
                    const role = (p.role as string)?.toLowerCase() as 'leaf' | 'planet' | 'moon';
                    const radius = role === 'planet' || role === 'moon' ? 250 : 180;
                    const isDirect = ((p.paths as unknown[])?.length || 0) > 0;
                    const known = getKnownDevice(p.address as string);

                    mapNodes.push({
                        id: p.address as string,
                        label: known?.nickname || (p.address as string),
                        role: role || 'leaf',
                        x: Math.cos(angle * i) * radius + (Math.random() - 0.5) * 40,
                        y: Math.sin(angle * i) * radius + (Math.random() - 0.5) * 40,
                        vx: 0,
                        vy: 0,
                        latency: (p.latency as number) || -1,
                        isDirect,
                        tags: known?.tags || [],
                    });

                    mapEdges.push({
                        from: selfId,
                        to: p.address as string,
                        isDirect,
                        latency: (p.latency as number) || -1,
                    });
                });
            }
        } catch { /* Service not available */ }

        // Add Central network members if available
        const token = getCentralToken();
        if (token) {
            try {
                const nets = await centralApi.listNetworks(token);
                for (const net of (nets || []).slice(0, 3)) {
                    const members = await centralApi.listMembers(token, net.id as string);
                    for (const m of members || []) {
                        const nodeId = (m.nodeId || m.config?.address || '') as string;
                        if (!mapNodes.find(n => n.id === nodeId)) {
                            const known = getKnownDevice(nodeId);
                            const existingNodes = mapNodes.length;
                            const angle = (2 * Math.PI) / Math.max(existingNodes, 1);
                            mapNodes.push({
                                id: nodeId,
                                label: known?.nickname || (m.name as string) || nodeId,
                                role: 'leaf',
                                x: Math.cos(angle * existingNodes) * 220 + (Math.random() - 0.5) * 60,
                                y: Math.sin(angle * existingNodes) * 220 + (Math.random() - 0.5) * 60,
                                vx: 0,
                                vy: 0,
                                latency: -1,
                                isDirect: false,
                                tags: known?.tags || [],
                            });
                        }
                    }
                }
            } catch { /* Central not available */ }
        }

        setNodes(mapNodes);
        setEdges(mapEdges);
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    // Force-directed layout simulation
    useEffect(() => {
        if (!canvasRef.current || nodes.length === 0) return;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const dpr = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        ctx.scale(dpr, dpr);

        const cx = rect.width / 2;
        const cy = rect.height / 2;

        const draw = () => {
            ctx.clearRect(0, 0, rect.width, rect.height);

            // Draw edges
            for (const edge of edges) {
                const from = nodes.find(n => n.id === edge.from);
                const to = nodes.find(n => n.id === edge.to);
                if (!from || !to) continue;

                ctx.beginPath();
                ctx.moveTo(cx + from.x, cy + from.y);
                ctx.lineTo(cx + to.x, cy + to.y);

                if (edge.isDirect) {
                    ctx.strokeStyle = 'rgba(16, 185, 129, 0.4)';
                    ctx.lineWidth = 2;
                } else {
                    ctx.strokeStyle = 'rgba(245, 158, 11, 0.25)';
                    ctx.lineWidth = 1;
                    ctx.setLineDash([5, 5]);
                }
                ctx.stroke();
                ctx.setLineDash([]);

                // Latency label
                if (edge.latency > 0) {
                    const mx = cx + (from.x + to.x) / 2;
                    const my = cy + (from.y + to.y) / 2;
                    ctx.font = '10px Inter, sans-serif';
                    ctx.fillStyle = 'rgba(156, 163, 175, 0.7)';
                    ctx.fillText(`${edge.latency}ms`, mx + 4, my - 4);
                }
            }

            // Draw nodes
            for (const node of nodes) {
                const nx = cx + node.x;
                const ny = cy + node.y;

                // Glow
                const gradient = ctx.createRadialGradient(nx, ny, 0, nx, ny, 25);
                let color = 'rgba(59, 130, 246, 0.3)';
                if (node.role === 'self') color = 'rgba(245, 158, 11, 0.4)';
                else if (node.role === 'planet') color = 'rgba(139, 92, 246, 0.3)';
                else if (node.role === 'moon') color = 'rgba(6, 182, 212, 0.3)';
                else if (node.isDirect) color = 'rgba(16, 185, 129, 0.3)';
                else color = 'rgba(107, 114, 128, 0.3)';

                gradient.addColorStop(0, color);
                gradient.addColorStop(1, 'transparent');
                ctx.fillStyle = gradient;
                ctx.beginPath();
                ctx.arc(nx, ny, 25, 0, Math.PI * 2);
                ctx.fill();

                // Node circle
                const radius = node.role === 'self' ? 10 : node.role === 'planet' || node.role === 'moon' ? 8 : 7;
                ctx.beginPath();
                ctx.arc(nx, ny, radius, 0, Math.PI * 2);
                let fillColor = '#3b82f6';
                if (node.role === 'self') fillColor = '#f59e0b';
                else if (node.role === 'planet') fillColor = '#8b5cf6';
                else if (node.role === 'moon') fillColor = '#06b6d4';
                else if (node.isDirect) fillColor = '#10b981';
                else fillColor = '#6b7280';
                ctx.fillStyle = fillColor;
                ctx.fill();

                // Border
                ctx.strokeStyle = 'rgba(255,255,255,0.2)';
                ctx.lineWidth = 1;
                ctx.stroke();

                // Label
                ctx.font = '11px Inter, sans-serif';
                ctx.fillStyle = 'rgba(232, 234, 237, 0.85)';
                ctx.textAlign = 'center';
                ctx.fillText(node.label.length > 14 ? node.label.slice(0, 14) + '…' : node.label, nx, ny + radius + 16);

                // Check hover
                const dx = mouseRef.current.x - nx;
                const dy = mouseRef.current.y - ny;
                if (dx * dx + dy * dy < radius * radius * 4) {
                    setHoveredNode(node);
                }
            }

            animFrameRef.current = requestAnimationFrame(draw);
        };

        animFrameRef.current = requestAnimationFrame(draw);
        return () => cancelAnimationFrame(animFrameRef.current);
    }, [nodes, edges]);

    const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
        const rect = canvasRef.current?.getBoundingClientRect();
        if (rect) {
            mouseRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
        }
    };

    return (
        <div className="app-layout">
            <Sidebar />
            <main className="main-content">
                <div className="page-container">
                    <div className="page-header">
                        <h2>Network Map</h2>
                        <p>Visual topology of all peers and their connections</p>
                        <div className="header-actions">
                            <button className="btn btn-secondary" onClick={fetchData}>↻ Refresh</button>
                        </div>
                    </div>

                    <div className="help-box">
                        <div className="help-title">💡 Reading the Map</div>
                        The <strong style={{ color: '#f59e0b' }}>gold node</strong> is your device.
                        <strong style={{ color: '#10b981' }}> Green</strong> = direct connection,
                        <strong style={{ color: '#6b7280' }}> gray</strong> = relayed,
                        <strong style={{ color: '#8b5cf6' }}> purple</strong> = root servers,
                        <strong style={{ color: '#06b6d4' }}> cyan</strong> = moon servers.
                        Solid lines are direct, dashed are relayed. Numbers show latency in ms.
                    </div>

                    <div className="network-map" style={{ height: 500 }}>
                        <canvas
                            ref={canvasRef}
                            style={{ width: '100%', height: '100%' }}
                            onMouseMove={handleMouseMove}
                            onMouseLeave={() => setHoveredNode(null)}
                        />
                        <div className="map-legend">
                            <div className="map-legend-item"><div className="map-legend-dot" style={{ background: '#f59e0b' }} /> This Node</div>
                            <div className="map-legend-item"><div className="map-legend-dot" style={{ background: '#10b981' }} /> Direct Peer</div>
                            <div className="map-legend-item"><div className="map-legend-dot" style={{ background: '#6b7280' }} /> Relayed Peer</div>
                            <div className="map-legend-item"><div className="map-legend-dot" style={{ background: '#8b5cf6' }} /> Planet (Root)</div>
                            <div className="map-legend-item"><div className="map-legend-dot" style={{ background: '#06b6d4' }} /> Moon</div>
                        </div>
                    </div>

                    {hoveredNode && (
                        <div className="card" style={{ marginTop: 12 }}>
                            <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
                                <div><span className="label">Node</span> <strong>{hoveredNode.label}</strong></div>
                                <div><span className="label">ID</span> <code style={{ fontFamily: 'var(--font-mono)' }}>{hoveredNode.id}</code></div>
                                <div><span className="label">Role</span> <span className="badge badge-blue">{hoveredNode.role.toUpperCase()}</span></div>
                                <div><span className="label">Connection</span> <span className={`badge ${hoveredNode.isDirect ? 'badge-green' : 'badge-amber'}`}>{hoveredNode.isDirect ? 'Direct' : 'Relayed'}</span></div>
                                {hoveredNode.latency > 0 && <div><span className="label">Latency</span> {hoveredNode.latency}ms</div>}
                                {hoveredNode.tags.length > 0 && (
                                    <div><span className="label">Tags</span> {hoveredNode.tags.map(t => <span key={t} className="tag" style={{ marginRight: 4, background: 'var(--accent-blue-dim)', color: 'var(--accent-blue)' }}>{t}</span>)}</div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
