'use client';

import { useState, useEffect, useCallback } from 'react';
import Sidebar from '@/components/Sidebar';
import { centralApi, getCentralToken } from '@/lib/api-client';

export default function RulesPage() {
    const [networks, setNetworks] = useState<{ id: string; name: string }[]>([]);
    const [selectedNetwork, setSelectedNetwork] = useState('');
    const [rulesSource, setRulesSource] = useState('');
    const [originalRules, setOriginalRules] = useState('');
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState('');
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

    const fetchRules = useCallback(async () => {
        if (!token || !selectedNetwork) return;
        try {
            const net = await centralApi.getNetwork(token, selectedNetwork);
            const rules = net?.rulesSource || 'accept;\n';
            setRulesSource(rules);
            setOriginalRules(rules);
        } catch { /* ignore */ }
    }, [token, selectedNetwork]);

    useEffect(() => { fetchNetworks(); }, [fetchNetworks]);
    useEffect(() => { if (selectedNetwork) fetchRules(); }, [selectedNetwork, fetchRules]);

    const handleSave = async () => {
        if (!token || !selectedNetwork) return;
        setSaving(true);
        try {
            await centralApi.updateNetwork(token, selectedNetwork, { rulesSource });
            setOriginalRules(rulesSource);
            setMessage('✅ Rules saved successfully');
            setTimeout(() => setMessage(''), 3000);
        } catch (err) {
            setMessage(`❌ Error: ${err instanceof Error ? err.message : String(err)}`);
        } finally {
            setSaving(false);
        }
    };

    const hasChanges = rulesSource !== originalRules;

    return (
        <div className="app-layout">
            <Sidebar />
            <main className="main-content">
                <div className="page-container">
                    <div className="page-header">
                        <h2>Flow Rules Editor</h2>
                        <p>Configure network-level firewall rules and access policies</p>
                    </div>

                    <div className="help-box">
                        <div className="help-title">💡 What are Flow Rules?</div>
                        Flow rules are ZeroTier&apos;s built-in network firewall. They control what traffic is allowed between members — like ACLs applied to every packet.
                        Rules are processed <strong>top to bottom</strong> (first match wins). The default rule <code style={{ fontFamily: 'var(--font-mono)' }}>accept;</code> allows all traffic.{' '}
                        <a href="/knowledge">Learn about flow rule syntax →</a>
                    </div>

                    {networks.length > 0 && (
                        <div className="form-group">
                            <label className="label">Network</label>
                            <select className="input" value={selectedNetwork} onChange={e => setSelectedNetwork(e.target.value)} style={{ maxWidth: 400 }}>
                                {networks.map(n => <option key={n.id} value={n.id}>{n.name} ({n.id})</option>)}
                            </select>
                        </div>
                    )}

                    {message && (
                        <div className={`help-box ${message.startsWith('❌') ? 'danger' : 'success'}`} style={{ marginBottom: 12 }}>
                            {message}
                        </div>
                    )}

                    <div style={{ marginBottom: 12, display: 'flex', gap: 8, alignItems: 'center' }}>
                        <button className="btn btn-primary" onClick={handleSave} disabled={!hasChanges || saving}>
                            {saving ? 'Saving...' : '💾 Save Rules'}
                        </button>
                        <button className="btn btn-secondary" onClick={fetchRules} disabled={!hasChanges}>↩️ Revert</button>
                        {hasChanges && <span style={{ fontSize: 12, color: 'var(--accent-primary)' }}>• Unsaved changes</span>}
                    </div>

                    <div style={{ position: 'relative' }}>
                        <textarea
                            className="input"
                            value={rulesSource}
                            onChange={e => setRulesSource(e.target.value)}
                            rows={20}
                            style={{
                                fontFamily: 'var(--font-mono)',
                                fontSize: 13,
                                lineHeight: 1.6,
                                resize: 'vertical',
                                minHeight: 300,
                                background: 'var(--bg-primary)',
                                whiteSpace: 'pre',
                            }}
                            placeholder="# Enter your flow rules here&#10;accept;"
                            spellCheck={false}
                        />
                    </div>

                    <div className="section-title" style={{ marginTop: 24 }}>Quick Reference</div>
                    <div className="grid-2">
                        <div className="card">
                            <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Common Actions</h3>
                            <div className="code-block" style={{ fontSize: 12 }}>
                                {`accept;       # Allow matching traffic
drop;         # Block matching traffic
tee <target>; # Copy to monitor
redirect;     # Redirect traffic`}
                            </div>
                        </div>
                        <div className="card">
                            <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Common Matchers</h3>
                            <div className="code-block" style={{ fontSize: 12 }}>
                                {`ipprotocol 6  # TCP
ipprotocol 17 # UDP
dport 22      # Destination port
sport 80      # Source port
ethertype ipv4
ethertype arp`}
                            </div>
                        </div>
                        <div className="card">
                            <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Allow Only SSH & HTTP</h3>
                            <div className="code-block" style={{ fontSize: 12 }}>
                                {`# Drop non-IP/ARP
drop
  not ethertype ipv4
  and not ethertype arp
  and not ethertype ipv6
;
accept ipprotocol 1;  # ICMP
accept dport 22;      # SSH
accept dport 80;      # HTTP
accept dport 443;     # HTTPS
drop;                 # Block rest`}
                            </div>
                        </div>
                        <div className="card">
                            <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Tag-Based Rules</h3>
                            <div className="code-block" style={{ fontSize: 12 }}>
                                {`tag department
  id 1
  enum 0 engineering
  enum 1 marketing
;
# Same department only
accept tor department 
       eq department;
drop;`}
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
