'use client';

import { useState, useEffect, useCallback } from 'react';
import Sidebar from '@/components/Sidebar';
import { centralApi, getCentralToken } from '@/lib/api-client';
import { useToast } from '@/components/Toast';
import { SkeletonTable } from '@/components/Skeleton';
import { logAction } from '@/lib/audit-log';

interface Network {
    id: string;
    config: {
        name: string;
        private: boolean;
        enableBroadcast: boolean;
        mtu: number;
        multicastLimit: number;
        ipAssignmentPools: { ipRangeStart: string; ipRangeEnd: string }[];
        routes: { target: string; via: string | null }[];
        v4AssignMode: { zt: boolean };
        dns: { domain: string; servers: string[] };
    };
    description: string;
    rulesSource: string;
    onlineMemberCount: number;
    authorizedMemberCount: number;
    totalMemberCount: number;
}

export default function NetworksPage() {
    const { addToast } = useToast();
    const [networks, setNetworks] = useState<Network[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreate, setShowCreate] = useState(false);
    const [newName, setNewName] = useState('');
    const [newIpStart, setNewIpStart] = useState('10.0.0.1');
    const [newIpEnd, setNewIpEnd] = useState('10.0.0.254');
    const [newRoute, setNewRoute] = useState('10.0.0.0/24');
    const [token] = useState(() => typeof window !== 'undefined' ? getCentralToken() : null);
    const [error, setError] = useState('');

    const fetchNetworks = useCallback(async () => {
        if (!token) return;
        setLoading(true);
        setError('');
        try {
            const nets = await centralApi.listNetworks(token);
            setNetworks(nets || []);
        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            const isAuth = msg.includes('Access Denied') || msg.includes('401') || msg.includes('403');
            if (isAuth) {
                setError('Access Denied — your API token may be invalid or expired. Update it in Settings.');
                addToast('API token rejected by ZeroTier Central. Check Settings.', 'error');
            } else {
                setError(`Failed to load networks: ${msg}`);
                addToast(`Failed to load networks: ${msg}`, 'error');
            }
        } finally {
            setLoading(false);
        }
    }, [token, addToast]);

    useEffect(() => { fetchNetworks(); }, [fetchNetworks]);

    const handleCreate = async () => {
        if (!token || !newName) return;
        try {
            await centralApi.createNetwork(token, {
                name: newName,
                private: true,
                v4AssignMode: { zt: true },
                ipAssignmentPools: [{ ipRangeStart: newIpStart, ipRangeEnd: newIpEnd }],
                routes: [{ target: newRoute, via: null }],
            });
            logAction('network_create', 'network', `Created network "${newName}"`, { ipRange: `${newIpStart}-${newIpEnd}`, route: newRoute });
            addToast(`Network "${newName}" created`, 'success');
            setShowCreate(false);
            setNewName('');
            fetchNetworks();
        } catch (err) {
            addToast(`Failed to create network: ${err instanceof Error ? err.message : String(err)}`, 'error');
        }
    };

    const handleDelete = async (id: string, name: string) => {
        if (!token) return;
        if (!confirm(`Delete network "${name}" (${id})? This cannot be undone!`)) return;
        try {
            await centralApi.deleteNetwork(token, id);
            logAction('network_delete', 'network', `Deleted network "${name}"`, { networkId: id });
            addToast(`Network "${name}" deleted`, 'success');
            fetchNetworks();
        } catch (err) {
            addToast(`Failed to delete: ${err instanceof Error ? err.message : String(err)}`, 'error');
        }
    };

    return (
        <div className="app-layout">
            <Sidebar />
            <main className="main-content">
                <div className="page-container">
                    <div className="page-header">
                        <h2>Networks</h2>
                        <p>Create, configure, and manage your ZeroTier virtual networks</p>
                        <div className="header-actions">
                            <button className="btn btn-primary" onClick={() => setShowCreate(true)}>+ Create Network</button>
                            <button className="btn btn-secondary" onClick={fetchNetworks}>↻ Refresh</button>
                        </div>
                    </div>

                    <div className="help-box">
                        <div className="help-title">💡 What is a network?</div>
                        A ZeroTier network is a virtual LAN that connects your devices over the internet. Each network has a unique
                        16-character ID, an IP address range, and managed routes. Devices must join and be authorized to communicate.
                        Learn more in the <a href="/knowledge">Knowledge Base</a>.
                    </div>

                    {!token && (
                        <div className="help-box warning">
                            <div className="help-title">⚠️ No API Token</div>
                            Add your Central API token in <a href="/settings">Settings</a> to manage networks.
                        </div>
                    )}

                    {error && (
                        <div className="help-box warning" style={{ marginBottom: 16 }}>
                            <div className="help-title">⚠️ Error</div>
                            {error}{' '}
                            <a href="/settings" style={{ color: 'var(--accent-blue)' }}>Go to Settings →</a>
                        </div>
                    )}

                    {loading ? (
                        <SkeletonTable rows={3} />
                    ) : networks.length === 0 ? (
                        <div className="card">
                            <div className="empty-state">
                                <div className="empty-icon">🌐</div>
                                <h3>No Networks</h3>
                                <p>Create your first network to connect devices.</p>
                            </div>
                        </div>
                    ) : (
                        <div style={{ display: 'grid', gap: 16 }}>
                            {networks.map(net => (
                                <div key={net.id} className="card fade-in">
                                    <div className="card-header">
                                        <div>
                                            <h3 style={{ fontSize: 17 }}><a href={`/networks/${net.id}`} style={{ color: 'inherit', textDecoration: 'none' }}>{net.config.name || 'Unnamed'}</a></h3>
                                            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-tertiary)', marginTop: 2 }}>
                                                {net.id}
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                            <span className={`badge ${net.config.private ? 'badge-green' : 'badge-amber'}`}>
                                                {net.config.private ? '🔒 Private' : '🌍 Public'}
                                            </span>
                                            <a href={`/networks/${net.id}`} className="btn btn-secondary btn-sm">Details</a>
                                            <button className="btn btn-danger btn-sm" onClick={() => handleDelete(net.id, net.config.name)}>
                                                Delete
                                            </button>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24, marginTop: 8 }}>
                                        <div>
                                            <div className="label">Members</div>
                                            <div style={{ fontSize: 14 }}>
                                                <span style={{ color: 'var(--accent-green)', fontWeight: 600 }}>{net.onlineMemberCount}</span>
                                                {' / '}{net.totalMemberCount}
                                            </div>
                                        </div>
                                        <div>
                                            <div className="label">IP Range</div>
                                            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13 }}>
                                                {net.config.ipAssignmentPools?.[0]
                                                    ? `${net.config.ipAssignmentPools[0].ipRangeStart} – ${net.config.ipAssignmentPools[0].ipRangeEnd}`
                                                    : 'None'}
                                            </div>
                                        </div>
                                        <div>
                                            <div className="label">Routes</div>
                                            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13 }}>
                                                {net.config.routes?.map(r => r.target).join(', ') || 'None'}
                                            </div>
                                        </div>
                                        <div>
                                            <div className="label">MTU</div>
                                            <div style={{ fontSize: 14 }}>{net.config.mtu}</div>
                                        </div>
                                        <div>
                                            <div className="label">Broadcast</div>
                                            <div style={{ fontSize: 14 }}>{net.config.enableBroadcast ? '✅ On' : '❌ Off'}</div>
                                        </div>
                                    </div>
                                    {net.description && (
                                        <div style={{ marginTop: 8, fontSize: 13, color: 'var(--text-secondary)' }}>{net.description}</div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Create Network Modal */}
                    {showCreate && (
                        <div className="modal-overlay" onClick={() => setShowCreate(false)}>
                            <div className="modal" onClick={e => e.stopPropagation()}>
                                <h3>Create Network</h3>
                                <div className="form-group">
                                    <label className="label">Network Name</label>
                                    <input className="input" value={newName} onChange={e => setNewName(e.target.value)} placeholder="My Network" />
                                </div>
                                <div className="grid-2">
                                    <div className="form-group">
                                        <label className="label">IP Range Start</label>
                                        <input className="input" value={newIpStart} onChange={e => setNewIpStart(e.target.value)} />
                                    </div>
                                    <div className="form-group">
                                        <label className="label">IP Range End</label>
                                        <input className="input" value={newIpEnd} onChange={e => setNewIpEnd(e.target.value)} />
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label className="label">Route CIDR</label>
                                    <input className="input" value={newRoute} onChange={e => setNewRoute(e.target.value)} />
                                </div>
                                <div className="help-box" style={{ fontSize: 12 }}>
                                    <div className="help-title">How IP assignment works</div>
                                    The IP range defines a pool of addresses ZeroTier will automatically assign to members.
                                    The route CIDR tells operating systems how to reach this subnet through ZeroTier.
                                </div>
                                <div className="modal-actions">
                                    <button className="btn btn-ghost" onClick={() => setShowCreate(false)}>Cancel</button>
                                    <button className="btn btn-primary" onClick={handleCreate} disabled={!newName}>Create</button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
