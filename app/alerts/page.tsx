'use client';

import { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import { getIntrusionEvents, acknowledgeEvent, clearAcknowledgedEvents, type IntrusionEvent } from '@/lib/device-registry';

export default function AlertsPage() {
    const [events, setEvents] = useState<IntrusionEvent[]>([]);
    const [filter, setFilter] = useState<'all' | 'unacknowledged' | 'critical' | 'warning' | 'info'>('unacknowledged');

    const refresh = () => setEvents(getIntrusionEvents());
    useEffect(() => { refresh(); }, []);

    const filtered = events.filter(e => {
        if (filter === 'unacknowledged') return !e.acknowledged;
        if (filter === 'critical') return e.severity === 'critical';
        if (filter === 'warning') return e.severity === 'warning';
        if (filter === 'info') return e.severity === 'info';
        return true;
    }).reverse();

    const unackCount = events.filter(e => !e.acknowledged).length;

    return (
        <div className="app-layout">
            <Sidebar />
            <main className="main-content">
                <div className="page-container">
                    <div className="page-header">
                        <h2>Intrusion Alerts</h2>
                        <p>Security events detected across your networks</p>
                        <div className="header-actions">
                            <button className="btn btn-secondary" onClick={() => { clearAcknowledgedEvents(); refresh(); }}>🗑️ Clear Acknowledged</button>
                        </div>
                    </div>

                    <div className="help-box">
                        <div className="help-title">🛡️ Intrusion Detection</div>
                        ZeroTier Manager automatically monitors your networks for security-relevant events: <strong>new unknown devices</strong> joining,
                        <strong> unauthorized join attempts</strong>, <strong>physical IP address changes</strong> (which may indicate a compromised device), and
                        <strong> client version changes</strong>. Register and trust devices in the <a href="/devices">Device Registry</a> to reduce noise.
                    </div>

                    <div className="tabs">
                        <button className={`tab ${filter === 'unacknowledged' ? 'active' : ''}`} onClick={() => setFilter('unacknowledged')}>
                            Unacknowledged {unackCount > 0 && <span className="nav-badge" style={{ marginLeft: 6 }}>{unackCount}</span>}
                        </button>
                        <button className={`tab ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')}>All</button>
                        <button className={`tab ${filter === 'critical' ? 'active' : ''}`} onClick={() => setFilter('critical')}>Critical</button>
                        <button className={`tab ${filter === 'warning' ? 'active' : ''}`} onClick={() => setFilter('warning')}>Warning</button>
                        <button className={`tab ${filter === 'info' ? 'active' : ''}`} onClick={() => setFilter('info')}>Info</button>
                    </div>

                    {filtered.length === 0 ? (
                        <div className="card">
                            <div className="empty-state">
                                <div className="empty-icon">🛡️</div>
                                <h3>No Alerts</h3>
                                <p>No security events match your filter. Your networks look clean!</p>
                            </div>
                        </div>
                    ) : (
                        <div className="card" style={{ padding: 0 }}>
                            {filtered.map(event => (
                                <div key={event.id} className="alert-item" style={{ opacity: event.acknowledged ? 0.5 : 1 }}>
                                    <div className={`alert-severity ${event.severity}`} />
                                    <div className="alert-content">
                                        <div className="alert-title">
                                            {event.type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                                            {event.deviceNickname && <span style={{ color: 'var(--text-secondary)', fontWeight: 400 }}> — {event.deviceNickname}</span>}
                                        </div>
                                        <div className="alert-desc">{event.description}</div>
                                        <div style={{ marginTop: 4, display: 'flex', gap: 8, alignItems: 'center' }}>
                                            <span className="badge badge-gray">{event.networkName}</span>
                                            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)' }}>{event.nodeId}</span>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                                        <div className="alert-time">{new Date(event.timestamp).toLocaleString()}</div>
                                        {!event.acknowledged && (
                                            <button className="btn btn-ghost btn-sm" onClick={() => { acknowledgeEvent(event.id); refresh(); }}>
                                                ✓ Acknowledge
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
