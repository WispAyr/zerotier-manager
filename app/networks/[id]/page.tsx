'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import { centralApi, serviceApi, getCentralToken } from '@/lib/api-client';
import { useToast } from '@/components/Toast';
import { logAction } from '@/lib/audit-log';
import { SkeletonTable } from '@/components/Skeleton';

interface NetworkConfig {
    name: string;
    private: boolean;
    enableBroadcast: boolean;
    v4AssignMode: { zt: boolean };
    v6AssignMode: { '6plane': boolean; rfc4193: boolean; zt: boolean };
    routes: { target: string; via: string | null }[];
    ipAssignmentPools: { ipRangeStart: string; ipRangeEnd: string }[];
    dns: { domain: string; servers: string[] };
    mtu: number;
    multicastLimit: number;
}

interface Network {
    id: string;
    config: NetworkConfig;
    description: string;
    rulesSource: string;
    creationTime: number;
    onlineMemberCount: number;
    authorizedMemberCount: number;
    totalMemberCount: number;
}

interface Member {
    nodeId: string;
    name: string;
    config: {
        authorized: boolean;
        activeBridge: boolean;
        ipAssignments: string[];
    };
    lastOnline: number;
    clientVersion: string;
    physicalAddress: string;
}

export default function NetworkDetailsPage() {
    const params = useParams();
    const router = useRouter();
    const id = params.id as string;
    const { addToast } = useToast();

    const [network, setNetwork] = useState<Network | null>(null);
    const [members, setMembers] = useState<Member[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [nudging, setNudging] = useState(false);

    // Editable fields
    const [editName, setEditName] = useState('');
    const [isEditingName, setIsEditingName] = useState(false);
    const [editDesc, setEditDesc] = useState('');
    const [isEditingDesc, setIsEditingDesc] = useState(false);
    const [isPrivate, setIsPrivate] = useState(true);
    const [enableBroadcast, setEnableBroadcast] = useState(true);
    const [v4AutoAssign, setV4AutoAssign] = useState(true);
    const [v6Plane, setV6Plane] = useState(false);
    const [v6Rfc4193, setV6Rfc4193] = useState(false);
    const [v6Zt, setV6Zt] = useState(false);

    // Editable numeric fields
    const [editMtu, setEditMtu] = useState('2800');
    const [isEditingMtu, setIsEditingMtu] = useState(false);
    const [editMulticast, setEditMulticast] = useState('32');
    const [isEditingMulticast, setIsEditingMulticast] = useState(false);

    // DNS editing
    const [editDnsDomain, setEditDnsDomain] = useState('');
    const [editDnsServers, setEditDnsServers] = useState('');
    const [isEditingDns, setIsEditingDns] = useState(false);

    // Add route
    const [showAddRoute, setShowAddRoute] = useState(false);
    const [newRouteTarget, setNewRouteTarget] = useState('');
    const [newRouteVia, setNewRouteVia] = useState('');

    // Add IP pool
    const [showAddPool, setShowAddPool] = useState(false);
    const [newPoolStart, setNewPoolStart] = useState('');

    // Add member
    const [showAddMember, setShowAddMember] = useState(false);
    const [newMemberNodeId, setNewMemberNodeId] = useState('');
    const [newMemberName, setNewMemberName] = useState('');
    const [newPoolEnd, setNewPoolEnd] = useState('');

    const token = getCentralToken();

    const syncState = (net: Network) => {
        setNetwork(net);
        setEditName(net.config.name);
        setEditDesc(net.description || '');
        setIsPrivate(net.config.private);
        setEnableBroadcast(net.config.enableBroadcast);
        setV4AutoAssign(net.config.v4AssignMode?.zt ?? true);
        setV6Plane(net.config.v6AssignMode?.['6plane'] ?? false);
        setV6Rfc4193(net.config.v6AssignMode?.rfc4193 ?? false);
        setV6Zt(net.config.v6AssignMode?.zt ?? false);
        setEditMtu(String(net.config.mtu || 2800));
        setEditMulticast(String(net.config.multicastLimit || 32));
        setEditDnsDomain(net.config.dns?.domain || '');
        setEditDnsServers(net.config.dns?.servers?.join(', ') || '');
    };

    const fetchData = useCallback(async () => {
        if (!token) return;
        try {
            const [net, mems] = await Promise.all([
                centralApi.getNetwork(token, id),
                centralApi.listMembers(token, id),
            ]);
            syncState(net);
            setMembers(mems || []);
        } catch (err) {
            addToast(`Failed to load network: ${err instanceof Error ? err.message : String(err)}`, 'error');
        } finally {
            setLoading(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [token, id]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const saveConfig = async (update: Record<string, unknown>, label: string) => {
        if (!token || !network) return;
        setSaving(true);
        try {
            const updated = await centralApi.updateNetwork(token, id, update);
            syncState(updated);
            logAction('network_update', 'network', `${label} on "${network.config.name}"`, { networkId: id });
            addToast(label, 'success');
        } catch (err) {
            addToast(`Failed: ${err instanceof Error ? err.message : String(err)}`, 'error');
        } finally {
            setSaving(false);
        }
    };

    const handleRenameSave = () => {
        if (!editName.trim()) return;
        saveConfig({ config: { name: editName.trim() } }, `Renamed to "${editName.trim()}"`);
        setIsEditingName(false);
    };

    const handleDescSave = () => {
        saveConfig({ description: editDesc }, 'Updated description');
        setIsEditingDesc(false);
    };

    const handleTogglePrivate = () => {
        const v = !isPrivate;
        setIsPrivate(v);
        saveConfig({ config: { private: v } }, v ? 'Set to Private' : 'Set to Public');
    };

    const handleToggleBroadcast = () => {
        const v = !enableBroadcast;
        setEnableBroadcast(v);
        saveConfig({ config: { enableBroadcast: v } }, v ? 'Broadcast enabled' : 'Broadcast disabled');
    };

    const handleToggleV4 = () => {
        const v = !v4AutoAssign;
        setV4AutoAssign(v);
        saveConfig({ config: { v4AssignMode: { zt: v } } }, v ? 'IPv4 Auto-Assign enabled' : 'IPv4 Auto-Assign disabled');
    };

    const handleToggleV6 = (field: '6plane' | 'rfc4193' | 'zt') => {
        const current = { '6plane': v6Plane, rfc4193: v6Rfc4193, zt: v6Zt };
        const newVal = !current[field];
        if (field === '6plane') setV6Plane(newVal);
        if (field === 'rfc4193') setV6Rfc4193(newVal);
        if (field === 'zt') setV6Zt(newVal);
        const update = { ...current, [field]: newVal };
        saveConfig({ config: { v6AssignMode: update } }, `IPv6 ${field} ${newVal ? 'enabled' : 'disabled'}`);
    };

    const handleMtuSave = () => {
        const val = parseInt(editMtu);
        if (isNaN(val) || val < 1280 || val > 10000) { addToast('MTU must be between 1280 and 10000', 'warning'); return; }
        saveConfig({ config: { mtu: val } }, `MTU set to ${val}`);
        setIsEditingMtu(false);
    };

    const handleMulticastSave = () => {
        const val = parseInt(editMulticast);
        if (isNaN(val) || val < 0 || val > 8192) { addToast('Multicast limit must be 0–8192', 'warning'); return; }
        saveConfig({ config: { multicastLimit: val } }, `Multicast limit set to ${val}`);
        setIsEditingMulticast(false);
    };

    const handleDnsSave = () => {
        const servers = editDnsServers.split(',').map(s => s.trim()).filter(Boolean);
        saveConfig({ config: { dns: { domain: editDnsDomain, servers } } }, 'DNS configuration updated');
        setIsEditingDns(false);
    };

    const handleAddRoute = () => {
        if (!newRouteTarget || !network) return;
        const routes = [...network.config.routes, { target: newRouteTarget, via: newRouteVia || null }];
        saveConfig({ config: { routes } }, `Added route ${newRouteTarget}`);
        setNewRouteTarget(''); setNewRouteVia(''); setShowAddRoute(false);
    };

    const handleRemoveRoute = (idx: number) => {
        if (!network) return;
        const routes = network.config.routes.filter((_, i) => i !== idx);
        saveConfig({ config: { routes } }, `Removed route ${network.config.routes[idx].target}`);
    };

    const handleAddPool = () => {
        if (!newPoolStart || !newPoolEnd || !network) return;
        const pools = [...network.config.ipAssignmentPools, { ipRangeStart: newPoolStart, ipRangeEnd: newPoolEnd }];
        saveConfig({ config: { ipAssignmentPools: pools } }, `Added IP pool ${newPoolStart}–${newPoolEnd}`);
        setNewPoolStart(''); setNewPoolEnd(''); setShowAddPool(false);
    };

    const handleRemovePool = (idx: number) => {
        if (!network) return;
        const pool = network.config.ipAssignmentPools[idx];
        const pools = network.config.ipAssignmentPools.filter((_, i) => i !== idx);
        saveConfig({ config: { ipAssignmentPools: pools } }, `Removed IP pool ${pool.ipRangeStart}–${pool.ipRangeEnd}`);
    };

    const handleToggleMember = async (memberId: string, authorized: boolean) => {
        if (!token) return;
        try {
            await centralApi.updateMember(token, id, memberId, { config: { authorized } });
            logAction(authorized ? 'member_authorize' : 'member_deauthorize', 'member',
                `${authorized ? 'Authorized' : 'Deauthorized'} member ${memberId}`, { networkId: id });
            addToast(`Member ${memberId} ${authorized ? 'authorized' : 'deauthorized'}`, 'success');
            fetchData();
        } catch (err) {
            addToast(`Failed: ${err instanceof Error ? err.message : String(err)}`, 'error');
        }
    };

    const handleToggleBridge = async (memberId: string, activeBridge: boolean) => {
        if (!token) return;
        try {
            await centralApi.updateMember(token, id, memberId, { config: { activeBridge } });
            addToast(`Bridge mode ${activeBridge ? 'enabled' : 'disabled'} for ${memberId}`, 'success');
            fetchData();
        } catch (err) {
            addToast(`Failed: ${err instanceof Error ? err.message : String(err)}`, 'error');
        }
    };

    const handleDeleteMember = async (memberId: string) => {
        if (!token) return;
        if (!confirm(`Remove member ${memberId} from this network?`)) return;
        try {
            await centralApi.deleteMember(token, id, memberId);
            logAction('member_remove', 'member', `Removed member ${memberId}`, { networkId: id });
            addToast(`Member ${memberId} removed`, 'success');
            fetchData();
        } catch (err) {
            addToast(`Failed: ${err instanceof Error ? err.message : String(err)}`, 'error');
        }
    };

    const handleAddMember = async () => {
        if (!token || !newMemberNodeId.trim()) return;
        const nodeId = newMemberNodeId.trim().toLowerCase();
        if (!/^[0-9a-f]{10}$/.test(nodeId)) {
            addToast('Node ID must be a 10-character hex string', 'warning');
            return;
        }
        try {
            await centralApi.updateMember(token, id, nodeId, {
                name: newMemberName.trim() || undefined,
                config: { authorized: true },
            });
            logAction('member_authorize', 'member', `Manually added & authorized member ${nodeId}`, { networkId: id });
            addToast(`Member ${nodeId} added and authorized`, 'success');
            setNewMemberNodeId('');
            setNewMemberName('');
            setShowAddMember(false);
            fetchData();
        } catch (err) {
            addToast(`Failed to add member: ${err instanceof Error ? err.message : String(err)}`, 'error');
        }
    };

    const handleDeleteNetwork = async () => {
        if (!token || !network) return;
        if (!confirm(`Delete network "${network.config.name}" (${id})? This CANNOT be undone!`)) return;
        try {
            await centralApi.deleteNetwork(token, id);
            logAction('network_delete', 'network', `Deleted network "${network.config.name}"`, { networkId: id });
            addToast(`Network "${network.config.name}" deleted`, 'success');
            router.push('/networks');
        } catch (err) {
            addToast(`Failed: ${err instanceof Error ? err.message : String(err)}`, 'error');
        }
    };

    if (!token) {
        return (
            <div className="app-layout">
                <Sidebar />
                <main className="main-content">
                    <div className="page-container">
                        <div className="help-box warning">
                            <div className="help-title">⚠️ No API Token</div>
                            Go to <a href="/settings">Settings</a> to configure your Central API token.
                        </div>
                    </div>
                </main>
            </div>
        );
    }

    return (
        <div className="app-layout">
            <Sidebar />
            <main className="main-content">
                <div className="page-container">
                    {/* Header */}
                    <div className="page-header">
                        <div>
                            <button className="btn btn-ghost" onClick={() => router.push('/networks')} style={{ marginBottom: 8, fontSize: 12 }}>
                                ← Back to Networks
                            </button>
                            {loading ? (
                                <h2>Loading...</h2>
                            ) : network ? (
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                    {isEditingName ? (
                                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                            <input className="input" value={editName} onChange={e => setEditName(e.target.value)}
                                                onKeyDown={e => e.key === 'Enter' && handleRenameSave()}
                                                autoFocus style={{ fontSize: 20, fontWeight: 700, maxWidth: 300 }} />
                                            <button className="btn btn-primary btn-sm" onClick={handleRenameSave}>Save</button>
                                            <button className="btn btn-ghost btn-sm" onClick={() => { setIsEditingName(false); setEditName(network.config.name); }}>Cancel</button>
                                        </div>
                                    ) : (
                                        <>
                                            <h2 style={{ margin: 0 }}>{network.config.name || 'Unnamed Network'}</h2>
                                            <button className="btn btn-ghost btn-sm" onClick={() => setIsEditingName(true)} title="Rename">✏️</button>
                                        </>
                                    )}
                                </div>
                            ) : <h2>Network Not Found</h2>}
                            <p style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--text-secondary)' }}>{id}</p>
                        </div>
                        {network && (
                            <div className="header-actions">
                                <button className="btn btn-secondary btn-sm" onClick={fetchData}>↻ Refresh</button>
                                <button className="btn btn-danger btn-sm" onClick={handleDeleteNetwork}>🗑️ Delete Network</button>
                            </div>
                        )}
                    </div>

                    {loading ? (
                        <SkeletonTable rows={4} />
                    ) : network ? (
                        <>
                            {/* Overview Stats */}
                            <div className="stat-grid" style={{ marginBottom: 24 }}>
                                <div className="stat-card accent-green">
                                    <div className="stat-icon">👥</div>
                                    <div className="stat-value">{network.onlineMemberCount}/{network.totalMemberCount}</div>
                                    <div className="stat-label">Members Online</div>
                                </div>
                                <div className="stat-card accent-blue">
                                    <div className="stat-icon">✅</div>
                                    <div className="stat-value">{network.authorizedMemberCount}</div>
                                    <div className="stat-label">Authorized</div>
                                </div>
                                <div className="stat-card accent-amber">
                                    <div className="stat-icon">{isPrivate ? '🔒' : '🌐'}</div>
                                    <div className="stat-value">{isPrivate ? 'Private' : 'Public'}</div>
                                    <div className="stat-label">Access</div>
                                </div>
                                <div className="stat-card accent-cyan">
                                    <div className="stat-icon">📅</div>
                                    <div className="stat-value" style={{ fontSize: 16 }}>{new Date(network.creationTime).toLocaleDateString()}</div>
                                    <div className="stat-label">Created</div>
                                </div>
                            </div>

                            {/* Description */}
                            <div className="card" style={{ marginBottom: 24 }}>
                                <div className="form-group" style={{ marginBottom: 0 }}>
                                    <label className="label">Description</label>
                                    {isEditingDesc ? (
                                        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                                            <textarea className="input" value={editDesc} onChange={e => setEditDesc(e.target.value)}
                                                rows={2} style={{ resize: 'vertical', flex: 1, maxWidth: 500 }} />
                                            <button className="btn btn-primary btn-sm" onClick={handleDescSave}>Save</button>
                                            <button className="btn btn-ghost btn-sm" onClick={() => { setIsEditingDesc(false); setEditDesc(network.description || ''); }}>Cancel</button>
                                        </div>
                                    ) : (
                                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                            <span style={{ color: network.description ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                                                {network.description || 'No description'}
                                            </span>
                                            <button className="btn btn-ghost btn-sm" onClick={() => setIsEditingDesc(true)}>✏️</button>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Network Settings */}
                            <div className="section-title">Network Settings</div>
                            <div className="card" style={{ marginBottom: 24 }}>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 20 }}>
                                    {/* Access Control */}
                                    <div className="form-group" style={{ margin: 0 }}>
                                        <label className="label">Access Control</label>
                                        <button className={`btn btn-sm ${isPrivate ? 'btn-primary' : 'btn-danger'}`}
                                            onClick={handleTogglePrivate} disabled={saving} style={{ width: '100%' }}>
                                            {isPrivate ? '🔒 Private' : '🌐 Public'}
                                        </button>
                                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                                            {isPrivate ? 'Members must be authorized' : 'Anyone can join'}
                                        </div>
                                    </div>

                                    {/* Broadcast */}
                                    <div className="form-group" style={{ margin: 0 }}>
                                        <label className="label">Ethernet Broadcast</label>
                                        <button className={`btn btn-sm ${enableBroadcast ? 'btn-primary' : 'btn-secondary'}`}
                                            onClick={handleToggleBroadcast} disabled={saving} style={{ width: '100%' }}>
                                            {enableBroadcast ? '✅ Enabled' : '❌ Disabled'}
                                        </button>
                                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                                            ff:ff:ff:ff:ff:ff broadcast
                                        </div>
                                    </div>

                                    {/* IPv4 Auto-Assign */}
                                    <div className="form-group" style={{ margin: 0 }}>
                                        <label className="label">IPv4 Auto-Assign</label>
                                        <button className={`btn btn-sm ${v4AutoAssign ? 'btn-primary' : 'btn-secondary'}`}
                                            onClick={handleToggleV4} disabled={saving} style={{ width: '100%' }}>
                                            {v4AutoAssign ? '✅ Enabled' : '❌ Disabled'}
                                        </button>
                                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                                            Auto-assign from pool
                                        </div>
                                    </div>

                                    {/* MTU */}
                                    <div className="form-group" style={{ margin: 0 }}>
                                        <label className="label">MTU</label>
                                        {isEditingMtu ? (
                                            <div style={{ display: 'flex', gap: 4 }}>
                                                <input className="input" value={editMtu} onChange={e => setEditMtu(e.target.value)}
                                                    onKeyDown={e => e.key === 'Enter' && handleMtuSave()}
                                                    type="number" min="1280" max="10000" style={{ width: 90 }} autoFocus />
                                                <button className="btn btn-primary btn-sm" onClick={handleMtuSave}>✓</button>
                                                <button className="btn btn-ghost btn-sm" onClick={() => { setIsEditingMtu(false); setEditMtu(String(network.config.mtu)); }}>✕</button>
                                            </div>
                                        ) : (
                                            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                                                <span style={{ fontFamily: 'var(--font-mono)' }}>{network.config.mtu}</span>
                                                <button className="btn btn-ghost btn-sm" onClick={() => setIsEditingMtu(true)}>✏️</button>
                                            </div>
                                        )}
                                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>1280–10000 bytes</div>
                                    </div>

                                    {/* Multicast Limit */}
                                    <div className="form-group" style={{ margin: 0 }}>
                                        <label className="label">Multicast Limit</label>
                                        {isEditingMulticast ? (
                                            <div style={{ display: 'flex', gap: 4 }}>
                                                <input className="input" value={editMulticast} onChange={e => setEditMulticast(e.target.value)}
                                                    onKeyDown={e => e.key === 'Enter' && handleMulticastSave()}
                                                    type="number" min="0" max="8192" style={{ width: 80 }} autoFocus />
                                                <button className="btn btn-primary btn-sm" onClick={handleMulticastSave}>✓</button>
                                                <button className="btn btn-ghost btn-sm" onClick={() => { setIsEditingMulticast(false); setEditMulticast(String(network.config.multicastLimit)); }}>✕</button>
                                            </div>
                                        ) : (
                                            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                                                <span style={{ fontFamily: 'var(--font-mono)' }}>{network.config.multicastLimit}</span>
                                                <button className="btn btn-ghost btn-sm" onClick={() => setIsEditingMulticast(true)}>✏️</button>
                                            </div>
                                        )}
                                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>Max recipients per multicast</div>
                                    </div>
                                </div>

                                {/* IPv6 */}
                                <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--border-primary)' }}>
                                    <label className="label" style={{ marginBottom: 12 }}>IPv6 Assignment Modes</label>
                                    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                                        <button className={`btn btn-sm ${v6Plane ? 'btn-primary' : 'btn-secondary'}`}
                                            onClick={() => handleToggleV6('6plane')} disabled={saving}>
                                            {v6Plane ? '✅' : '◻️'} 6PLANE
                                        </button>
                                        <button className={`btn btn-sm ${v6Rfc4193 ? 'btn-primary' : 'btn-secondary'}`}
                                            onClick={() => handleToggleV6('rfc4193')} disabled={saving}>
                                            {v6Rfc4193 ? '✅' : '◻️'} RFC4193
                                        </button>
                                        <button className={`btn btn-sm ${v6Zt ? 'btn-primary' : 'btn-secondary'}`}
                                            onClick={() => handleToggleV6('zt')} disabled={saving}>
                                            {v6Zt ? '✅' : '◻️'} Auto-Assign
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* DNS */}
                            <div className="section-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                DNS Configuration
                                {!isEditingDns && <button className="btn btn-secondary btn-sm" onClick={() => setIsEditingDns(true)}>✏️ Edit DNS</button>}
                            </div>
                            <div className="card" style={{ marginBottom: 24 }}>
                                {isEditingDns ? (
                                    <div>
                                        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 12 }}>
                                            <div className="form-group" style={{ margin: 0, flex: 1, minWidth: 180 }}>
                                                <label className="label" style={{ fontSize: 11 }}>Search Domain</label>
                                                <input className="input" value={editDnsDomain} onChange={e => setEditDnsDomain(e.target.value)} placeholder="home.lan" />
                                            </div>
                                            <div className="form-group" style={{ margin: 0, flex: 2, minWidth: 240 }}>
                                                <label className="label" style={{ fontSize: 11 }}>DNS Servers (comma-separated)</label>
                                                <input className="input" value={editDnsServers} onChange={e => setEditDnsServers(e.target.value)} placeholder="10.0.0.1, 10.0.0.2" />
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', gap: 8 }}>
                                            <button className="btn btn-primary btn-sm" onClick={handleDnsSave}>Save DNS</button>
                                            <button className="btn btn-ghost btn-sm" onClick={() => setIsEditingDns(false)}>Cancel</button>
                                        </div>
                                    </div>
                                ) : (
                                    <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap' }}>
                                        <div><span className="label">Domain: </span><span style={{ fontFamily: 'var(--font-mono)' }}>{network.config.dns?.domain || '—'}</span></div>
                                        <div><span className="label">Servers: </span><span style={{ fontFamily: 'var(--font-mono)' }}>{network.config.dns?.servers?.join(', ') || '—'}</span></div>
                                    </div>
                                )}
                            </div>

                            {/* Managed Routes */}
                            <div className="section-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                Managed Routes
                                <button className="btn btn-secondary btn-sm" onClick={() => setShowAddRoute(true)}>+ Add Route</button>
                            </div>
                            <div className="card" style={{ marginBottom: 24, padding: 0 }}>
                                {showAddRoute && (
                                    <div style={{ padding: 16, borderBottom: '1px solid var(--border-primary)', display: 'flex', gap: 8, alignItems: 'flex-end', flexWrap: 'wrap' }}>
                                        <div className="form-group" style={{ margin: 0 }}>
                                            <label className="label" style={{ fontSize: 11 }}>Target (CIDR)</label>
                                            <input className="input" value={newRouteTarget} onChange={e => setNewRouteTarget(e.target.value)} placeholder="10.0.0.0/24" style={{ width: 160 }} />
                                        </div>
                                        <div className="form-group" style={{ margin: 0 }}>
                                            <label className="label" style={{ fontSize: 11 }}>Via (optional gateway)</label>
                                            <input className="input" value={newRouteVia} onChange={e => setNewRouteVia(e.target.value)} placeholder="10.0.0.1" style={{ width: 140 }} />
                                        </div>
                                        <button className="btn btn-primary btn-sm" onClick={handleAddRoute} disabled={!newRouteTarget}>Add</button>
                                        <button className="btn btn-ghost btn-sm" onClick={() => setShowAddRoute(false)}>Cancel</button>
                                    </div>
                                )}
                                {network.config.routes.length === 0 ? (
                                    <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)' }}>No managed routes configured</div>
                                ) : (
                                    <table className="table">
                                        <thead><tr><th>Target</th><th>Via</th><th></th></tr></thead>
                                        <tbody>
                                            {network.config.routes.map((route, i) => (
                                                <tr key={i}>
                                                    <td style={{ fontFamily: 'var(--font-mono)' }}>{route.target}</td>
                                                    <td style={{ fontFamily: 'var(--font-mono)', color: route.via ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                                                        {route.via || '(LAN)'}
                                                    </td>
                                                    <td style={{ textAlign: 'right' }}>
                                                        <button className="btn btn-ghost btn-sm" onClick={() => handleRemoveRoute(i)} title="Remove">🗑️</button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                            </div>

                            {/* IP Assignment Pools */}
                            <div className="section-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                IP Assignment Pools
                                <button className="btn btn-secondary btn-sm" onClick={() => setShowAddPool(true)}>+ Add Pool</button>
                            </div>
                            <div className="card" style={{ marginBottom: 24, padding: 0 }}>
                                {showAddPool && (
                                    <div style={{ padding: 16, borderBottom: '1px solid var(--border-primary)', display: 'flex', gap: 8, alignItems: 'flex-end', flexWrap: 'wrap' }}>
                                        <div className="form-group" style={{ margin: 0 }}>
                                            <label className="label" style={{ fontSize: 11 }}>Range Start</label>
                                            <input className="input" value={newPoolStart} onChange={e => setNewPoolStart(e.target.value)} placeholder="10.0.0.1" style={{ width: 140 }} />
                                        </div>
                                        <div className="form-group" style={{ margin: 0 }}>
                                            <label className="label" style={{ fontSize: 11 }}>Range End</label>
                                            <input className="input" value={newPoolEnd} onChange={e => setNewPoolEnd(e.target.value)} placeholder="10.0.0.254" style={{ width: 140 }} />
                                        </div>
                                        <button className="btn btn-primary btn-sm" onClick={handleAddPool} disabled={!newPoolStart || !newPoolEnd}>Add</button>
                                        <button className="btn btn-ghost btn-sm" onClick={() => setShowAddPool(false)}>Cancel</button>
                                    </div>
                                )}
                                {network.config.ipAssignmentPools.length === 0 ? (
                                    <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)' }}>No IP assignment pools</div>
                                ) : (
                                    <table className="table">
                                        <thead><tr><th>Range Start</th><th>Range End</th><th></th></tr></thead>
                                        <tbody>
                                            {network.config.ipAssignmentPools.map((pool, i) => (
                                                <tr key={i}>
                                                    <td style={{ fontFamily: 'var(--font-mono)' }}>{pool.ipRangeStart}</td>
                                                    <td style={{ fontFamily: 'var(--font-mono)' }}>{pool.ipRangeEnd}</td>
                                                    <td style={{ textAlign: 'right' }}>
                                                        <button className="btn btn-ghost btn-sm" onClick={() => handleRemovePool(i)} title="Remove">🗑️</button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                            </div>

                            {/* Members */}
                            <div className="section-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                Members ({members.length})
                                <button className="btn btn-secondary btn-sm" onClick={() => setShowAddMember(true)}>+ Add Member</button>
                            </div>
                            <div className="card" style={{ padding: 0 }}>
                                {showAddMember && (
                                    <div style={{ padding: 16, borderBottom: '1px solid var(--border-primary)', display: 'flex', gap: 8, alignItems: 'flex-end', flexWrap: 'wrap' }}>
                                        <div className="form-group" style={{ margin: 0 }}>
                                            <label className="label" style={{ fontSize: 11 }}>Node ID (10-char hex)</label>
                                            <input className="input" value={newMemberNodeId} onChange={e => setNewMemberNodeId(e.target.value)}
                                                placeholder="e.g. a1b2c3d4e5" style={{ width: 140, fontFamily: 'var(--font-mono)' }}
                                                maxLength={10} />
                                        </div>
                                        <div className="form-group" style={{ margin: 0 }}>
                                            <label className="label" style={{ fontSize: 11 }}>Name (optional)</label>
                                            <input className="input" value={newMemberName} onChange={e => setNewMemberName(e.target.value)}
                                                placeholder="Device name" style={{ width: 160 }} />
                                        </div>
                                        <button className="btn btn-primary btn-sm" onClick={handleAddMember} disabled={!newMemberNodeId.trim()}>Add & Authorize</button>
                                        <button className="btn btn-ghost btn-sm" onClick={() => setShowAddMember(false)}>Cancel</button>
                                    </div>
                                )}
                                {members.length === 0 ? (
                                    <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)' }}>
                                        No members. Devices need to join this network using: <code style={{ fontSize: 12 }}>zerotier-cli join {id}</code>
                                    </div>
                                ) : (
                                    <div style={{ overflowX: 'auto' }}>
                                        <table className="table">
                                            <thead>
                                                <tr>
                                                    <th>Node ID</th>
                                                    <th>Name</th>
                                                    <th>IPs</th>
                                                    <th>Status</th>
                                                    <th>Version</th>
                                                    <th>Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {members.map(m => {
                                                    const isOnline = m.lastOnline > 0 && (Date.now() - m.lastOnline) < 300000;
                                                    return (
                                                        <tr key={m.nodeId}>
                                                            <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{m.nodeId}</td>
                                                            <td>{m.name || <span style={{ color: 'var(--text-muted)' }}>—</span>}</td>
                                                            <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                                                                {m.config.ipAssignments.join(', ') || '—'}
                                                            </td>
                                                            <td>
                                                                <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                                                                    <span className={`badge ${m.config.authorized ? 'badge-green' : 'badge-red'}`}>
                                                                        {m.config.authorized ? '✅ Auth' : '❌ Unauth'}
                                                                    </span>
                                                                    <span className={`badge ${isOnline ? 'badge-green' : 'badge-gray'}`}>
                                                                        {isOnline ? '🟢 Online' : '⚫ Offline'}
                                                                    </span>
                                                                    {m.config.activeBridge && <span className="badge badge-blue">🌉 Bridge</span>}
                                                                </div>
                                                            </td>
                                                            <td style={{ fontSize: 12 }}>{m.clientVersion || '—'}</td>
                                                            <td>
                                                                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                                                                    <button className={`btn btn-sm ${m.config.authorized ? 'btn-secondary' : 'btn-primary'}`}
                                                                        onClick={() => handleToggleMember(m.nodeId, !m.config.authorized)}
                                                                        title={m.config.authorized ? 'Deauthorize' : 'Authorize'}>
                                                                        {m.config.authorized ? '🚫 Deauth' : '✅ Auth'}
                                                                    </button>
                                                                    <button className={`btn btn-sm ${m.config.activeBridge ? 'btn-primary' : 'btn-ghost'}`}
                                                                        onClick={() => handleToggleBridge(m.nodeId, !m.config.activeBridge)}
                                                                        title="Toggle bridge mode">
                                                                        🌉
                                                                    </button>
                                                                    <button className="btn btn-ghost btn-sm" onClick={() => handleDeleteMember(m.nodeId)} title="Remove member">🗑️</button>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>

                            {/* Troubleshooting / Nudge */}
                            <div className="section-title" style={{ marginTop: 24 }}>🔧 Troubleshooting</div>
                            <div className="card" style={{ marginBottom: 24 }}>
                                <div className="help-box" style={{ marginBottom: 16, fontSize: 13 }}>
                                    <div className="help-title">💡 Nudge Controls</div>
                                    ZeroTier clients sometimes need a nudge to reconnect, refresh routes, or pick up config changes.
                                    Use the tools below to troubleshoot stuck connections.
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: 16 }}>
                                    {/* Leave & Rejoin */}
                                    <div style={{ padding: 16, borderRadius: 8, border: '1px solid var(--border-primary)', background: 'var(--bg-secondary)' }}>
                                        <div style={{ fontWeight: 600, marginBottom: 4 }}>🔄 Leave & Rejoin</div>
                                        <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 12 }}>
                                            Cycles the local node off this network and back on. Fixes most connectivity issues.
                                        </div>
                                        <button className="btn btn-secondary btn-sm" disabled={nudging}
                                            onClick={async () => {
                                                setNudging(true);
                                                try {
                                                    addToast('Leaving network...', 'info');
                                                    await serviceApi.leaveNetwork(id);
                                                    await new Promise(r => setTimeout(r, 2000));
                                                    addToast('Rejoining network...', 'info');
                                                    await serviceApi.joinNetwork(id);
                                                    logAction('network_nudge', 'network', `Leave & rejoin nudge on ${id}`, { networkId: id });
                                                    addToast('Network rejoined successfully!', 'success');
                                                } catch (err) {
                                                    addToast(`Nudge failed: ${err instanceof Error ? err.message : String(err)}`, 'error');
                                                } finally {
                                                    setNudging(false);
                                                }
                                            }}>
                                            {nudging ? '⏳ Working...' : '🔄 Leave & Rejoin'}
                                        </button>
                                    </div>

                                    {/* Deauth & Reauth All */}
                                    <div style={{ padding: 16, borderRadius: 8, border: '1px solid var(--border-primary)', background: 'var(--bg-secondary)' }}>
                                        <div style={{ fontWeight: 600, marginBottom: 4 }}>🔑 Deauth & Reauth Member</div>
                                        <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 12 }}>
                                            Cycles a member&apos;s authorization. Forces config refresh on the client.
                                        </div>
                                        <select className="input" id="nudge-member" style={{ marginBottom: 8, fontSize: 12 }}>
                                            {members.map(m => (
                                                <option key={m.nodeId} value={m.nodeId}>{m.nodeId} — {m.name || 'unnamed'}</option>
                                            ))}
                                        </select>
                                        <button className="btn btn-secondary btn-sm" disabled={nudging || members.length === 0}
                                            onClick={async () => {
                                                const select = document.getElementById('nudge-member') as HTMLSelectElement;
                                                const memberId = select?.value;
                                                if (!memberId || !token) return;
                                                setNudging(true);
                                                try {
                                                    addToast(`Deauthorizing ${memberId}...`, 'info');
                                                    await centralApi.updateMember(token, id, memberId, { config: { authorized: false } });
                                                    await new Promise(r => setTimeout(r, 3000));
                                                    addToast(`Reauthorizing ${memberId}...`, 'info');
                                                    await centralApi.updateMember(token, id, memberId, { config: { authorized: true } });
                                                    logAction('member_nudge', 'member', `Deauth/reauth nudge on ${memberId}`, { networkId: id });
                                                    addToast(`Member ${memberId} nudged successfully!`, 'success');
                                                    fetchData();
                                                } catch (err) {
                                                    addToast(`Nudge failed: ${err instanceof Error ? err.message : String(err)}`, 'error');
                                                } finally {
                                                    setNudging(false);
                                                }
                                            }}>
                                            {nudging ? '⏳ Working...' : '🔑 Deauth & Reauth'}
                                        </button>
                                    </div>

                                    {/* Force Orbit */}
                                    <div style={{ padding: 16, borderRadius: 8, border: '1px solid var(--border-primary)', background: 'var(--bg-secondary)' }}>
                                        <div style={{ fontWeight: 600, marginBottom: 4 }}>🌍 Refresh Peers</div>
                                        <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 12 }}>
                                            Force the local node to re-discover peers on this network.
                                        </div>
                                        <button className="btn btn-secondary btn-sm" disabled={nudging}
                                            onClick={async () => {
                                                setNudging(true);
                                                try {
                                                    const peers = await serviceApi.getPeers();
                                                    const count = peers?.length || 0;
                                                    logAction('peer_refresh', 'network', `Refreshed peers: ${count} active`, { networkId: id });
                                                    addToast(`Found ${count} active peers`, 'success');
                                                } catch (err) {
                                                    addToast(`Failed to refresh peers: ${err instanceof Error ? err.message : String(err)}`, 'error');
                                                } finally {
                                                    setNudging(false);
                                                }
                                            }}>
                                            {nudging ? '⏳ Working...' : '🌍 Refresh Peers'}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Danger Zone */}
                            <div className="section-title" style={{ marginTop: 32, color: 'var(--accent-red)' }}>⚠️ Danger Zone</div>
                            <div className="card" style={{ borderColor: 'var(--accent-red)', borderWidth: 1, borderStyle: 'solid' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                                    <div>
                                        <strong>Delete this network</strong>
                                        <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>This will permanently delete the network and disconnect all members. This action cannot be undone.</div>
                                    </div>
                                    <button className="btn btn-danger" onClick={handleDeleteNetwork}>Delete Network</button>
                                </div>
                            </div>
                        </>
                    ) : null}
                </div>
            </main>
        </div>
    );
}
