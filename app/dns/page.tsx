'use client';

import { useState, useEffect, useCallback } from 'react';
import Sidebar from '@/components/Sidebar';
import { centralApi, getCentralToken } from '@/lib/api-client';

export default function DnsPage() {
    const [networks, setNetworks] = useState<{ id: string; name: string; dns: { domain: string; servers: string[] } }[]>([]);
    const [selectedNetwork, setSelectedNetwork] = useState('');
    const [domain, setDomain] = useState('');
    const [servers, setServers] = useState('');
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState('');
    const token = typeof window !== 'undefined' ? getCentralToken() : null;

    const fetchNetworks = useCallback(async () => {
        if (!token) return;
        try {
            const nets = await centralApi.listNetworks(token);
            const list = (nets || []).map((n: Record<string, unknown>) => {
                const config = n.config as Record<string, unknown>;
                const dns = config?.dns as { domain: string; servers: string[] } || { domain: '', servers: [] };
                return {
                    id: n.id as string,
                    name: config?.name as string || n.id as string,
                    dns,
                };
            });
            setNetworks(list);
            if (list.length > 0 && !selectedNetwork) {
                setSelectedNetwork(list[0].id);
                setDomain(list[0].dns.domain || '');
                setServers((list[0].dns.servers || []).join('\n'));
            }
        } catch { /* ignore */ }
    }, [token, selectedNetwork]);

    useEffect(() => { fetchNetworks(); }, [fetchNetworks]);

    useEffect(() => {
        const net = networks.find(n => n.id === selectedNetwork);
        if (net) {
            setDomain(net.dns.domain || '');
            setServers((net.dns.servers || []).join('\n'));
        }
    }, [selectedNetwork, networks]);

    const handleSave = async () => {
        if (!token || !selectedNetwork) return;
        setSaving(true);
        try {
            const serverList = servers.split('\n').map(s => s.trim()).filter(Boolean);
            await centralApi.updateNetwork(token, selectedNetwork, {
                config: {
                    dns: {
                        domain: domain.trim(),
                        servers: serverList,
                    },
                },
            });
            setMessage('✅ DNS configuration saved');
            setTimeout(() => setMessage(''), 3000);
            fetchNetworks();
        } catch (err) {
            setMessage(`❌ Error: ${err instanceof Error ? err.message : String(err)}`);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="app-layout">
            <Sidebar />
            <main className="main-content">
                <div className="page-container">
                    <div className="page-header">
                        <h2>DNS Configuration</h2>
                        <p>Configure DNS push for your ZeroTier networks</p>
                    </div>

                    <div className="help-box">
                        <div className="help-title">💡 How ZeroTier DNS Works</div>
                        ZeroTier can push DNS settings to members so devices automatically resolve names for your network.
                        Set a <strong>search domain</strong> (e.g., <code style={{ fontFamily: 'var(--font-mono)' }}>zt.home.local</code>) and one or more
                        <strong> DNS servers</strong> (IP addresses of DNS servers inside your ZeroTier network, like Pi-hole or NextDNS).
                        Members will use these settings when connected.
                    </div>

                    {networks.length > 0 && (
                        <div className="form-group">
                            <label className="label">Network</label>
                            <select className="input" value={selectedNetwork} onChange={e => setSelectedNetwork(e.target.value)} style={{ maxWidth: 400 }}>
                                {networks.map(n => <option key={n.id} value={n.id}>{n.name} ({n.id})</option>)}
                            </select>
                        </div>
                    )}

                    {message && <div className={`help-box ${message.startsWith('❌') ? 'danger' : 'success'}`}>{message}</div>}

                    <div className="card">
                        <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16 }}>DNS Settings for {networks.find(n => n.id === selectedNetwork)?.name || 'network'}</h3>

                        <div className="form-group">
                            <label className="label">Search Domain</label>
                            <input className="input" value={domain} onChange={e => setDomain(e.target.value)} placeholder="e.g., zt.home.local" style={{ maxWidth: 400 }} />
                            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                                Devices will append this domain when resolving short hostnames. For example, &quot;nas&quot; → &quot;nas.zt.home.local&quot;.
                            </div>
                        </div>

                        <div className="form-group">
                            <label className="label">DNS Servers (one per line)</label>
                            <textarea className="input" value={servers} onChange={e => setServers(e.target.value)} rows={4} placeholder="10.0.0.1&#10;10.0.0.2" style={{ fontFamily: 'var(--font-mono)', maxWidth: 400 }} />
                            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                                These should be ZeroTier IPs of DNS servers on this network (e.g., Pi-hole, Unbound, NextDNS).
                            </div>
                        </div>

                        <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                            {saving ? 'Saving...' : '💾 Save DNS Config'}
                        </button>
                    </div>
                </div>
            </main>
        </div>
    );
}
