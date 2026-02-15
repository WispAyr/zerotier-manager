'use client';

import { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import { serviceApi } from '@/lib/api-client';
import { getKnownDevice } from '@/lib/device-registry';

export default function PeersPage() {
    const [peers, setPeers] = useState<Record<string, unknown>[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetch = async () => {
            setLoading(true);
            try {
                const p = await serviceApi.getPeers();
                setPeers(Array.isArray(p) ? p : []);
            } catch { /* ignore */ }
            setLoading(false);
        };
        fetch();
        const interval = setInterval(fetch, 10000);
        return () => clearInterval(interval);
    }, []);

    const leafPeers = peers.filter(p => p.role === 'LEAF');
    const rootPeers = peers.filter(p => p.role === 'PLANET' || p.role === 'MOON');

    return (
        <div className="app-layout">
            <Sidebar />
            <main className="main-content">
                <div className="page-container">
                    <div className="page-header">
                        <h2>Peers</h2>
                        <p>View real-time peer connections from your local ZeroTier node</p>
                    </div>

                    <div className="help-box">
                        <div className="help-title">💡 Understanding Peers</div>
                        Peers are other ZeroTier nodes your device is communicating with. <strong>LEAF</strong> peers are regular devices on your networks.
                        <strong> PLANET</strong> peers are ZeroTier&apos;s root servers (used for peer discovery and relay). <strong>MOON</strong> peers
                        are custom root servers you operate.{' '}
                        <strong>Direct connections</strong> (shown with a physical path) are peer-to-peer — traffic goes straight between devices.{' '}
                        <strong>Relayed connections</strong> go through root servers so are slower. <a href="/knowledge">Learn more →</a>
                    </div>

                    {loading ? (
                        <div className="loading-container"><div className="loader" />Loading peers...</div>
                    ) : peers.length === 0 ? (
                        <div className="card">
                            <div className="empty-state">
                                <div className="empty-icon">🔗</div>
                                <h3>No Peers</h3>
                                <p>ZeroTier service may not be running, or no peers are connected.</p>
                            </div>
                        </div>
                    ) : (
                        <>
                            <div className="stat-grid" style={{ marginBottom: 20 }}>
                                <div className="stat-card accent-blue">
                                    <div className="stat-icon">🔗</div>
                                    <div className="stat-value">{peers.length}</div>
                                    <div className="stat-label">Total Peers</div>
                                </div>
                                <div className="stat-card accent-green">
                                    <div className="stat-icon">✅</div>
                                    <div className="stat-value">{leafPeers.filter(p => ((p.paths as unknown[])?.length || 0) > 0).length}</div>
                                    <div className="stat-label">Direct</div>
                                </div>
                                <div className="stat-card accent-amber">
                                    <div className="stat-icon">🔄</div>
                                    <div className="stat-value">{leafPeers.filter(p => !((p.paths as unknown[])?.length)).length}</div>
                                    <div className="stat-label">Relayed</div>
                                </div>
                                <div className="stat-card accent-purple">
                                    <div className="stat-icon">🌍</div>
                                    <div className="stat-value">{rootPeers.length}</div>
                                    <div className="stat-label">Root Servers</div>
                                </div>
                            </div>

                            {rootPeers.length > 0 && (
                                <>
                                    <div className="section-title">Root Servers (Planet / Moon)</div>
                                    <div className="table-container" style={{ marginBottom: 20 }}>
                                        <table className="table">
                                            <thead><tr><th>Address</th><th>Role</th><th>Latency</th><th>Version</th><th>Paths</th></tr></thead>
                                            <tbody>
                                                {rootPeers.map(p => {
                                                    const paths = (p.paths as { active: boolean; address: string; lastReceive: number; lastSend: number; preferred: boolean }[]) || [];
                                                    return (
                                                        <tr key={p.address as string}>
                                                            <td style={{ fontFamily: 'var(--font-mono)' }}>{p.address as string}</td>
                                                            <td><span className="badge badge-blue">{p.role as string}</span></td>
                                                            <td>{p.latency !== undefined && (p.latency as number) >= 0 ? `${p.latency}ms` : '—'}</td>
                                                            <td>{p.version as string || '—'}</td>
                                                            <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                                                                {paths.map((path, i) => (
                                                                    <div key={i}>{path.address} {path.preferred ? '⭐' : ''}</div>
                                                                ))}
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                </>
                            )}

                            <div className="section-title">Leaf Peers (Devices)</div>
                            <div className="table-container">
                                <table className="table">
                                    <thead><tr><th>Device</th><th>Address</th><th>Connection</th><th>Latency</th><th>Version</th><th>Paths</th></tr></thead>
                                    <tbody>
                                        {leafPeers.map(p => {
                                            const paths = (p.paths as { active: boolean; address: string; lastReceive: number; lastSend: number; preferred: boolean }[]) || [];
                                            const isDirect = paths.length > 0;
                                            const known = getKnownDevice(p.address as string);
                                            return (
                                                <tr key={p.address as string}>
                                                    <td>
                                                        <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{known?.nickname || 'Unknown'}</span>
                                                        {known?.tags?.map(t => (
                                                            <span key={t} className="tag" style={{ marginLeft: 4, background: 'var(--accent-blue-dim)', color: 'var(--accent-blue)' }}>{t}</span>
                                                        ))}
                                                    </td>
                                                    <td style={{ fontFamily: 'var(--font-mono)' }}>{p.address as string}</td>
                                                    <td>
                                                        <span className={`badge ${isDirect ? 'badge-green' : 'badge-amber'}`}>
                                                            {isDirect ? '✅ Direct' : '🔄 Relay'}
                                                        </span>
                                                    </td>
                                                    <td>{p.latency !== undefined && (p.latency as number) >= 0 ? `${p.latency}ms` : '—'}</td>
                                                    <td>{p.version as string || '—'}</td>
                                                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                                                        {paths.length > 0 ? paths.map((path, i) => (
                                                            <div key={i}>{path.address} {path.preferred ? '⭐' : ''}</div>
                                                        )) : <span style={{ color: 'var(--text-muted)' }}>Relayed via root</span>}
                                                    </td>
                                                </tr>
                                            );
                                        })}
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
