'use client';

import { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import { centralApi, getCentralToken } from '@/lib/api-client';
import { useToast } from '@/components/Toast';
import { SkeletonStatGrid } from '@/components/Skeleton';

interface NetworkConfig {
    id: string;
    name: string;
    private: boolean;
    v4AssignMode: { zt: boolean };
    v6AssignMode: { zt: boolean; sixplane: boolean; rfc4193: boolean };
    multicastLimit: number;
    enableBroadcast: boolean;
    mtu: number;
    routes: { target: string; via?: string }[];
    ipAssignmentPools: { ipRangeStart: string; ipRangeEnd: string }[];
    dns: { domain: string; servers: string[] };
    rules: unknown[];
}

interface CompareField {
    label: string;
    getValue: (n: NetworkConfig) => string;
}

const fields: CompareField[] = [
    { label: 'Name', getValue: n => n.name || '(unnamed)' },
    { label: 'Private', getValue: n => n.private ? 'Yes' : 'No' },
    { label: 'Broadcast', getValue: n => n.enableBroadcast ? 'Enabled' : 'Disabled' },
    { label: 'MTU', getValue: n => String(n.mtu || 2800) },
    { label: 'Multicast Limit', getValue: n => String(n.multicastLimit || 32) },
    { label: 'IPv4 Auto-Assign', getValue: n => n.v4AssignMode?.zt ? 'Yes' : 'No' },
    { label: 'IPv6 Auto-Assign', getValue: n => n.v6AssignMode?.zt ? 'Yes' : 'No' },
    { label: '6PLANE', getValue: n => n.v6AssignMode?.sixplane ? 'Yes' : 'No' },
    { label: 'RFC 4193', getValue: n => n.v6AssignMode?.rfc4193 ? 'Yes' : 'No' },
    { label: 'Routes', getValue: n => (n.routes || []).map(r => r.target + (r.via ? ` via ${r.via}` : '')).join(', ') || 'None' },
    { label: 'IP Pools', getValue: n => (n.ipAssignmentPools || []).map(p => `${p.ipRangeStart}-${p.ipRangeEnd}`).join(', ') || 'None' },
    { label: 'DNS Domain', getValue: n => n.dns?.domain || 'Not set' },
    { label: 'DNS Servers', getValue: n => (n.dns?.servers || []).join(', ') || 'Not set' },
    { label: 'Rule Count', getValue: n => String((n.rules || []).length) },
];

export default function ComparePage() {
    const { addToast } = useToast();
    const [networks, setNetworks] = useState<NetworkConfig[]>([]);
    const [loading, setLoading] = useState(true);
    const [netA, setNetA] = useState<string>('');
    const [netB, setNetB] = useState<string>('');

    useEffect(() => {
        const token = getCentralToken();
        if (!token) {
            setLoading(false);
            return;
        }
        centralApi.listNetworks(token)
            .then((data: NetworkConfig[]) => {
                setNetworks(data || []);
                if (data && data.length >= 2) {
                    setNetA(data[0].id);
                    setNetB(data[1].id);
                } else if (data && data.length === 1) {
                    setNetA(data[0].id);
                }
            })
            .catch(() => addToast('Failed to load networks. Check your API token.', 'error'))
            .finally(() => setLoading(false));
    }, [addToast]);

    const configA = networks.find(n => n.id === netA);
    const configB = networks.find(n => n.id === netB);

    return (
        <div className="app-layout">
            <Sidebar />
            <main className="main-content">
                <div className="page-container fade-in">
                    <div className="page-header">
                        <h2>⚖️ Compare Networks</h2>
                        <p>Side-by-side comparison of two network configurations — differences are highlighted</p>
                    </div>

                    {loading ? (
                        <SkeletonStatGrid count={2} />
                    ) : networks.length < 2 ? (
                        <div className="card" style={{ textAlign: 'center', padding: 40 }}>
                            <div style={{ fontSize: 32, marginBottom: 12 }}>⚖️</div>
                            <p style={{ color: 'var(--text-secondary)' }}>
                                You need at least 2 networks to compare. Currently {networks.length === 0 ? 'no networks found — configure your API token in Settings.' : 'only 1 network found.'}
                            </p>
                        </div>
                    ) : (
                        <>
                            {/* Network selectors */}
                            <div className="compare-grid" style={{ marginBottom: 24 }}>
                                <div>
                                    <label className="label">Network A</label>
                                    <select className="input" value={netA} onChange={e => setNetA(e.target.value)}>
                                        {networks.map(n => (
                                            <option key={n.id} value={n.id}>{n.name || n.id} ({n.id.slice(0, 10)})</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="label">Network B</label>
                                    <select className="input" value={netB} onChange={e => setNetB(e.target.value)}>
                                        {networks.map(n => (
                                            <option key={n.id} value={n.id}>{n.name || n.id} ({n.id.slice(0, 10)})</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {netA === netB ? (
                                <div className="alert alert-info" style={{ marginBottom: 20 }}>
                                    ℹ️ Select two different networks to see differences highlighted.
                                </div>
                            ) : null}

                            {/* Comparison table */}
                            {configA && configB && (
                                <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                                    {/* Header */}
                                    <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr 1fr', borderBottom: '1px solid var(--border-subtle)' }}>
                                        <div style={{ padding: '12px 16px', fontWeight: 600, fontSize: 13, color: 'var(--text-secondary)', background: 'var(--bg-tertiary)' }}>Property</div>
                                        <div style={{ padding: '12px 16px', fontWeight: 600, fontSize: 13, color: 'var(--accent-blue)', background: 'var(--bg-tertiary)', borderLeft: '1px solid var(--border-subtle)' }}>
                                            {configA.name || configA.id.slice(0, 10)}
                                        </div>
                                        <div style={{ padding: '12px 16px', fontWeight: 600, fontSize: 13, color: 'var(--accent-purple)', background: 'var(--bg-tertiary)', borderLeft: '1px solid var(--border-subtle)' }}>
                                            {configB.name || configB.id.slice(0, 10)}
                                        </div>
                                    </div>

                                    {/* Rows */}
                                    {fields.map(field => {
                                        const valA = field.getValue(configA);
                                        const valB = field.getValue(configB);
                                        const isDiff = valA !== valB && netA !== netB;

                                        return (
                                            <div
                                                key={field.label}
                                                style={{
                                                    display: 'grid',
                                                    gridTemplateColumns: '200px 1fr 1fr',
                                                    borderBottom: '1px solid var(--border-subtle)',
                                                    background: isDiff ? 'var(--accent-primary-dim)' : 'transparent',
                                                }}
                                            >
                                                <div style={{ padding: '10px 16px', fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)' }}>
                                                    {isDiff && <span style={{ marginRight: 6, color: 'var(--accent-primary)' }}>●</span>}
                                                    {field.label}
                                                </div>
                                                <div style={{ padding: '10px 16px', fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--text-primary)', borderLeft: '1px solid var(--border-subtle)', wordBreak: 'break-all' }}>
                                                    {valA}
                                                </div>
                                                <div style={{ padding: '10px 16px', fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--text-primary)', borderLeft: '1px solid var(--border-subtle)', wordBreak: 'break-all' }}>
                                                    {valB}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}

                            {configA && configB && netA !== netB && (
                                <div style={{ marginTop: 12, fontSize: 12, color: 'var(--text-muted)', textAlign: 'center' }}>
                                    {fields.filter(f => f.getValue(configA!) !== f.getValue(configB!)).length} difference{fields.filter(f => f.getValue(configA!) !== f.getValue(configB!)).length !== 1 ? 's' : ''} found across {fields.length} properties
                                </div>
                            )}
                        </>
                    )}
                </div>
            </main>
        </div>
    );
}
