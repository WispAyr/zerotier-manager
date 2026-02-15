'use client';

import { useState, useMemo } from 'react';
import Sidebar from '@/components/Sidebar';
import { getAuditLog, clearAuditLog, exportAuditLog, actionLabels, categoryIcons, type AuditEntry } from '@/lib/audit-log';
import { useToast } from '@/components/Toast';

export default function AuditPage() {
    const { addToast } = useToast();
    const [entries, setEntries] = useState<AuditEntry[]>(() => getAuditLog().reverse());
    const [filter, setFilter] = useState<string>('all');

    const categories = ['all', 'network', 'member', 'rules', 'dns', 'device', 'settings'] as const;

    const filtered = useMemo(() => {
        if (filter === 'all') return entries;
        return entries.filter(e => e.category === filter);
    }, [entries, filter]);

    function handleClear() {
        if (!confirm('Clear all audit log entries?')) return;
        clearAuditLog();
        setEntries([]);
        addToast('Audit log cleared', 'success');
    }

    function handleExport() {
        const data = exportAuditLog();
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `zerotier-audit-log-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
        addToast('Audit log exported', 'success');
    }

    function formatTime(ts: number): string {
        const d = new Date(ts);
        const now = new Date();
        const diffMs = now.getTime() - d.getTime();
        const diffMin = Math.floor(diffMs / 60000);

        if (diffMin < 1) return 'Just now';
        if (diffMin < 60) return `${diffMin}m ago`;
        if (diffMin < 1440) return `${Math.floor(diffMin / 60)}h ago`;
        return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    return (
        <div className="app-layout">
            <Sidebar />
            <main className="main-content">
                <div className="page-container fade-in">
                    <div className="page-header">
                        <h2>📝 Audit Log</h2>
                        <p>Track all administrative actions performed in this session</p>
                        <div className="header-actions">
                            <button className="btn btn-secondary" onClick={handleExport} disabled={entries.length === 0}>
                                📥 Export JSON
                            </button>
                            <button className="btn btn-danger" onClick={handleClear} disabled={entries.length === 0}>
                                🗑️ Clear Log
                            </button>
                        </div>
                    </div>

                    {/* Filter tabs */}
                    <div className="tab-bar" style={{ marginBottom: 20 }}>
                        {categories.map(cat => (
                            <button
                                key={cat}
                                className={`tab ${filter === cat ? 'active' : ''}`}
                                onClick={() => setFilter(cat)}
                            >
                                {cat === 'all' ? '📋 All' : `${categoryIcons[cat as AuditEntry['category']]} ${cat.charAt(0).toUpperCase() + cat.slice(1)}`}
                            </button>
                        ))}
                    </div>

                    {filtered.length === 0 ? (
                        <div className="card" style={{ textAlign: 'center', padding: 40 }}>
                            <div style={{ fontSize: 32, marginBottom: 12 }}>📝</div>
                            <p style={{ color: 'var(--text-secondary)' }}>
                                {entries.length === 0
                                    ? 'No actions logged yet. Admin actions like authorizing members, updating rules, or changing DNS will appear here.'
                                    : 'No entries match the selected filter.'}
                            </p>
                        </div>
                    ) : (
                        <div className="card" style={{ padding: 0 }}>
                            {filtered.map(entry => (
                                <div key={entry.id} className="audit-item">
                                    <div className="audit-icon">
                                        {categoryIcons[entry.category]}
                                    </div>
                                    <div className="audit-content">
                                        <div className="audit-action">{actionLabels[entry.action]}</div>
                                        <div className="audit-desc">{entry.description}</div>
                                        {entry.details && (
                                            <div style={{ marginTop: 4 }}>
                                                {Object.entries(entry.details).map(([k, v]) => (
                                                    <span key={k} className="tag" style={{ marginRight: 6, marginTop: 4 }}>
                                                        {k}: {String(v)}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    <div className="audit-time">{formatTime(entry.timestamp)}</div>
                                </div>
                            ))}
                        </div>
                    )}

                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 12, textAlign: 'center' }}>
                        Showing {filtered.length} of {entries.length} entries
                    </div>
                </div>
            </main>
        </div>
    );
}
