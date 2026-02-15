'use client';

import { useState, useEffect, useCallback } from 'react';
import Sidebar from '@/components/Sidebar';
import { centralApi, getCentralToken } from '@/lib/api-client';
import { getKnownDevice, upsertKnownDevice, addDeviceTag, removeDeviceTag, suggestedTags } from '@/lib/device-registry';

export default function MembersPage() {
    const [networks, setNetworks] = useState<{ id: string; name: string }[]>([]);
    const [selectedNetwork, setSelectedNetwork] = useState('');
    const [members, setMembers] = useState<Record<string, unknown>[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingDevice, setEditingDevice] = useState<string | null>(null);
    const [nickname, setNickname] = useState('');
    const token = typeof window !== 'undefined' ? getCentralToken() : null;

    const fetchNetworks = useCallback(async () => {
        if (!token) return;
        try {
            const nets = await centralApi.listNetworks(token);
            const list = (nets || []).map((n: Record<string, unknown>) => ({
                id: n.id as string,
                name: (n.config as Record<string, unknown>)?.name as string || n.id as string,
            }));
            setNetworks(list);
            if (list.length > 0 && !selectedNetwork) setSelectedNetwork(list[0].id);
        } catch { /* ignore */ }
    }, [token, selectedNetwork]);

    const fetchMembers = useCallback(async () => {
        if (!token || !selectedNetwork) return;
        setLoading(true);
        try {
            const m = await centralApi.listMembers(token, selectedNetwork);
            setMembers(m || []);
        } catch { /* ignore */ } finally { setLoading(false); }
    }, [token, selectedNetwork]);

    useEffect(() => { fetchNetworks(); }, [fetchNetworks]);
    useEffect(() => { if (selectedNetwork) fetchMembers(); }, [selectedNetwork, fetchMembers]);

    const toggleAuth = async (memberId: string, current: boolean) => {
        if (!token || !selectedNetwork) return;
        try {
            await centralApi.updateMember(token, selectedNetwork, memberId, { config: { authorized: !current } });
            fetchMembers();
        } catch (err) { alert(String(err)); }
    };

    const saveName = (nodeId: string) => {
        upsertKnownDevice({ nodeId, nickname });
        setEditingDevice(null);
        setNickname('');
    };

    const handleAddTag = (nodeId: string, tag: string) => {
        addDeviceTag(nodeId, tag);
        setMembers([...members]); // force re-render
    };

    const handleRemoveTag = (nodeId: string, tag: string) => {
        removeDeviceTag(nodeId, tag);
        setMembers([...members]);
    };

    return (
        <div className="app-layout">
            <Sidebar />
            <main className="main-content">
                <div className="page-container">
                    <div className="page-header">
                        <h2>Members</h2>
                        <p>Manage devices on your networks — authorize, tag, and configure</p>
                    </div>

                    <div className="help-box">
                        <div className="help-title">💡 About Members</div>
                        Every device that joins a private network appears here as a member. New devices are &quot;not authorized&quot; by default —
                        you must authorize them before they can communicate on the network. You can also assign nicknames and tags
                        to keep track of which device is which.
                    </div>

                    {networks.length > 0 && (
                        <div className="form-group">
                            <label className="label">Select Network</label>
                            <select className="input" value={selectedNetwork} onChange={e => setSelectedNetwork(e.target.value)} style={{ maxWidth: 400 }}>
                                {networks.map(n => (
                                    <option key={n.id} value={n.id}>{n.name} ({n.id})</option>
                                ))}
                            </select>
                        </div>
                    )}

                    {loading ? (
                        <div className="loading-container"><div className="loader" />Loading members...</div>
                    ) : members.length === 0 ? (
                        <div className="card">
                            <div className="empty-state">
                                <div className="empty-icon">👥</div>
                                <h3>No Members</h3>
                                <p>No devices have joined this network yet.</p>
                            </div>
                        </div>
                    ) : (
                        <div className="table-container">
                            <table className="table">
                                <thead>
                                    <tr>
                                        <th>Device</th>
                                        <th>Node ID</th>
                                        <th>IPs</th>
                                        <th>Status</th>
                                        <th>Auth</th>
                                        <th>Tags</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {members.map((m) => {
                                        const config = m.config as Record<string, unknown>;
                                        const nodeId = (m.nodeId || config?.address || '') as string;
                                        const known = getKnownDevice(nodeId);
                                        const authorized = config?.authorized as boolean;
                                        const ips = (config?.ipAssignments as string[]) || [];
                                        const name = (m.name as string) || known?.nickname || '';
                                        const tags = known?.tags || [];

                                        return (
                                            <tr key={nodeId}>
                                                <td>
                                                    {editingDevice === nodeId ? (
                                                        <div style={{ display: 'flex', gap: 4 }}>
                                                            <input className="input" value={nickname} onChange={e => setNickname(e.target.value)} placeholder="Nickname" style={{ width: 140, padding: '4px 8px' }} />
                                                            <button className="btn btn-primary btn-sm" onClick={() => saveName(nodeId)}>✓</button>
                                                        </div>
                                                    ) : (
                                                        <div>
                                                            <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{name || 'Unknown'}</span>
                                                            <button className="btn btn-ghost btn-sm" onClick={() => { setEditingDevice(nodeId); setNickname(known?.nickname || name); }} style={{ marginLeft: 4, padding: '2px 4px', fontSize: 10 }}>✏️</button>
                                                            {known?.trusted && <span className="badge badge-green" style={{ marginLeft: 6, fontSize: 10 }}>Trusted</span>}
                                                        </div>
                                                    )}
                                                </td>
                                                <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12.5 }}>{nodeId}</td>
                                                <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12.5 }}>{ips.join(', ') || '—'}</td>
                                                <td>
                                                    <span className={`badge ${m.lastOnline && Date.now() - (m.lastOnline as number) < 120000 ? 'badge-green' : 'badge-gray'}`}>
                                                        <span className={`status-dot ${m.lastOnline && Date.now() - (m.lastOnline as number) < 120000 ? 'online' : 'offline'}`} />
                                                        {m.lastOnline && Date.now() - (m.lastOnline as number) < 120000 ? 'Online' : 'Offline'}
                                                    </span>
                                                </td>
                                                <td>
                                                    <button className={`btn btn-sm ${authorized ? 'btn-primary' : 'btn-danger'}`} onClick={() => toggleAuth(nodeId, authorized)}>
                                                        {authorized ? '✅ Yes' : '❌ No'}
                                                    </button>
                                                </td>
                                                <td>
                                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, alignItems: 'center' }}>
                                                        {tags.map(t => {
                                                            const preset = suggestedTags.find(s => s.label === t);
                                                            return (
                                                                <span key={t} className="tag tag-removable" style={{ background: `${preset?.color || '#6b7280'}22`, color: preset?.color || '#9ca3af' }} onClick={() => handleRemoveTag(nodeId, t)}>
                                                                    {t} <span className="tag-x">×</span>
                                                                </span>
                                                            );
                                                        })}
                                                        <select className="input" style={{ width: 80, padding: '2px 4px', fontSize: 11 }} value="" onChange={e => { if (e.target.value) handleAddTag(nodeId, e.target.value); }}>
                                                            <option value="">+Tag</option>
                                                            {suggestedTags.filter(s => !tags.includes(s.label)).map(s => (
                                                                <option key={s.label} value={s.label}>{s.label}</option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                </td>
                                                <td>
                                                    <button className="btn btn-danger btn-sm" onClick={async () => {
                                                        if (!token || !confirm(`Remove ${name || nodeId}?`)) return;
                                                        await centralApi.deleteMember(token, selectedNetwork, nodeId);
                                                        fetchMembers();
                                                    }}>Remove</button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
