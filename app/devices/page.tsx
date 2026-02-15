'use client';

import { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import { getKnownDevices, removeKnownDevice, upsertKnownDevice, suggestedTags, addDeviceTag, removeDeviceTag, type KnownDevice } from '@/lib/device-registry';

export default function DevicesPage() {
    const [devices, setDevices] = useState<KnownDevice[]>([]);
    const [editId, setEditId] = useState<string | null>(null);
    const [editNickname, setEditNickname] = useState('');
    const [editNotes, setEditNotes] = useState('');
    const [filter, setFilter] = useState('');

    const refresh = () => setDevices(getKnownDevices());
    useEffect(() => { refresh(); }, []);

    const filtered = devices.filter(d =>
        d.nodeId.includes(filter) ||
        d.nickname.toLowerCase().includes(filter.toLowerCase()) ||
        d.tags.some(t => t.toLowerCase().includes(filter.toLowerCase()))
    );

    const startEdit = (device: KnownDevice) => {
        setEditId(device.nodeId);
        setEditNickname(device.nickname);
        setEditNotes(device.notes);
    };

    const saveEdit = () => {
        if (editId) {
            upsertKnownDevice({ nodeId: editId, nickname: editNickname, notes: editNotes });
            setEditId(null);
            refresh();
        }
    };

    const toggleTrust = (nodeId: string, current: boolean) => {
        upsertKnownDevice({ nodeId, trusted: !current });
        refresh();
    };

    return (
        <div className="app-layout">
            <Sidebar />
            <main className="main-content">
                <div className="page-container">
                    <div className="page-header">
                        <h2>Device Registry</h2>
                        <p>Tag, name, and track known devices across your ZeroTier networks</p>
                    </div>

                    <div className="help-box">
                        <div className="help-title">💡 Device Tagging</div>
                        The device registry lets you keep track of all devices that have ever appeared on your networks.
                        Add <strong>nicknames</strong> so you know which device is which (e.g., &quot;Office NAS&quot;, &quot;Mom&apos;s Laptop&quot;).
                        Use <strong>tags</strong> to categorize devices (Server, IoT, Production, etc.).
                        Mark devices as <strong>Trusted</strong> — the intrusion detection system will treat unknown devices as potential threats
                        and flag them for review.
                    </div>

                    <div className="form-group" style={{ maxWidth: 400 }}>
                        <input className="input" placeholder="Filter by name, ID, or tag..." value={filter} onChange={e => setFilter(e.target.value)} />
                    </div>

                    {filtered.length === 0 ? (
                        <div className="card">
                            <div className="empty-state">
                                <div className="empty-icon">🏷️</div>
                                <h3>No Known Devices</h3>
                                <p>Devices will appear here once they&apos;re seen on your networks. Visit the Dashboard or Members page to trigger a scan.</p>
                            </div>
                        </div>
                    ) : (
                        <div style={{ display: 'grid', gap: 12 }}>
                            {filtered.map(device => (
                                <div key={device.nodeId} className="card fade-in">
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
                                        <div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                <span style={{ fontWeight: 600, fontSize: 15 }}>{device.nickname || 'Unnamed'}</span>
                                                {device.trusted && <span className="badge badge-green" style={{ fontSize: 10 }}>✅ Trusted</span>}
                                            </div>
                                            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-tertiary)', marginTop: 2 }}>
                                                {device.nodeId}
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', gap: 6 }}>
                                            <button className="btn btn-secondary btn-sm" onClick={() => startEdit(device)}>✏️ Edit</button>
                                            <button className="btn btn-sm" style={{ background: device.trusted ? 'var(--accent-primary-dim)' : 'var(--accent-green-dim)', color: device.trusted ? 'var(--accent-primary)' : 'var(--accent-green)', border: 'none' }} onClick={() => toggleTrust(device.nodeId, device.trusted)}>
                                                {device.trusted ? '🔓 Untrust' : '🔒 Trust'}
                                            </button>
                                            <button className="btn btn-danger btn-sm" onClick={() => { removeKnownDevice(device.nodeId); refresh(); }}>🗑️</button>
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginTop: 10, fontSize: 13 }}>
                                        <div><span className="label">First Seen</span>{new Date(device.firstSeen).toLocaleDateString()}</div>
                                        <div><span className="label">Last Seen</span>{new Date(device.lastSeen).toLocaleDateString()}</div>
                                        {device.physicalAddress && <div><span className="label">Physical IP</span><span style={{ fontFamily: 'var(--font-mono)' }}>{device.physicalAddress}</span></div>}
                                        {device.clientVersion && <div><span className="label">Version</span>{device.clientVersion}</div>}
                                        {device.networks.length > 0 && <div><span className="label">Networks</span>{device.networks.length}</div>}
                                    </div>

                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 10, alignItems: 'center' }}>
                                        {device.tags.map(t => {
                                            const preset = suggestedTags.find(s => s.label === t);
                                            return (
                                                <span key={t} className="tag tag-removable" style={{ background: `${preset?.color || '#6b7280'}22`, color: preset?.color || '#9ca3af' }} onClick={() => { removeDeviceTag(device.nodeId, t); refresh(); }}>
                                                    {t} <span className="tag-x">×</span>
                                                </span>
                                            );
                                        })}
                                        <select className="input" style={{ width: 100, padding: '2px 6px', fontSize: 11 }} value="" onChange={e => { if (e.target.value) { addDeviceTag(device.nodeId, e.target.value); refresh(); } }}>
                                            <option value="">+ Add Tag</option>
                                            {suggestedTags.filter(s => !device.tags.includes(s.label)).map(s => (
                                                <option key={s.label} value={s.label}>{s.label}</option>
                                            ))}
                                        </select>
                                    </div>

                                    {device.notes && <div style={{ marginTop: 8, fontSize: 13, color: 'var(--text-secondary)', fontStyle: 'italic' }}>{device.notes}</div>}
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Edit Modal */}
                    {editId && (
                        <div className="modal-overlay" onClick={() => setEditId(null)}>
                            <div className="modal" onClick={e => e.stopPropagation()}>
                                <h3>Edit Device</h3>
                                <div className="form-group">
                                    <label className="label">Nickname</label>
                                    <input className="input" value={editNickname} onChange={e => setEditNickname(e.target.value)} placeholder="e.g., Office NAS" />
                                </div>
                                <div className="form-group">
                                    <label className="label">Notes</label>
                                    <textarea className="input" value={editNotes} onChange={e => setEditNotes(e.target.value)} rows={3} placeholder="Any notes about this device..." />
                                </div>
                                <div className="modal-actions">
                                    <button className="btn btn-ghost" onClick={() => setEditId(null)}>Cancel</button>
                                    <button className="btn btn-primary" onClick={saveEdit}>Save</button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
