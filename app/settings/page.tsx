'use client';

import { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import { getCentralToken, setCentralToken, clearCentralToken, serviceApi, centralApi } from '@/lib/api-client';
import { useToast } from '@/components/Toast';
import { logAction } from '@/lib/audit-log';
import { getKnownDevices, type KnownDevice } from '@/lib/device-registry';
import { getIntrusionEvents, type IntrusionEvent } from '@/lib/device-registry';

export default function SettingsPage() {
    const { addToast } = useToast();
    const [token, setToken] = useState('');
    const [savedToken, setSavedToken] = useState<string | null>(null);
    const [showToken, setShowToken] = useState(false);
    const [nodeInfo, setNodeInfo] = useState<Record<string, unknown> | null>(null);
    const [userInfo, setUserInfo] = useState<Record<string, unknown> | null>(null);
    const [testResult, setTestResult] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
    const [testMessage, setTestMessage] = useState('');

    useEffect(() => {
        const stored = getCentralToken();
        setSavedToken(stored);
        if (stored) setToken(stored);

        serviceApi.getStatus().then(s => setNodeInfo(s)).catch(() => { });
    }, []);

    useEffect(() => {
        if (savedToken) {
            centralApi.getSelf(savedToken).then(u => setUserInfo(u)).catch(() => { });
        }
    }, [savedToken]);

    const handleSave = () => {
        setCentralToken(token);
        setSavedToken(token);
        setTestResult('idle');
        logAction('token_update', 'settings', 'API token updated');
        addToast('API token saved', 'success');
    };

    const handleClear = () => {
        clearCentralToken();
        setSavedToken(null);
        setToken('');
        setUserInfo(null);
        setTestResult('idle');
        logAction('token_clear', 'settings', 'API token cleared');
        addToast('API token cleared', 'success');
    };

    const handleTest = async () => {
        setTestResult('testing');
        try {
            const user = await centralApi.getSelf(token);
            setUserInfo(user);
            setTestResult('success');
            setTestMessage(`Authenticated as ${user?.displayName || user?.email || 'Unknown User'}`);
            addToast('Connection successful!', 'success');
        } catch (err) {
            setTestResult('error');
            setTestMessage(err instanceof Error ? err.message : 'Connection failed');
            addToast('Connection failed', 'error');
        }
    };

    const handleExportDevices = () => {
        const devices = getKnownDevices();
        const events = getIntrusionEvents();
        const data = JSON.stringify({ devices, events, exportedAt: new Date().toISOString() }, null, 2);
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `zerotier-devices-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
        addToast('Device data exported', 'success');
    };

    const handleImportDevices = () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = async (e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (!file) return;
            try {
                const text = await file.text();
                const data = JSON.parse(text) as { devices?: KnownDevice[]; events?: IntrusionEvent[] };
                if (data.devices) localStorage.setItem('zt-known-devices', JSON.stringify(data.devices));
                if (data.events) localStorage.setItem('zt-intrusion-events', JSON.stringify(data.events));
                addToast(`Imported ${data.devices?.length || 0} devices and ${data.events?.length || 0} events`, 'success');
            } catch {
                addToast('Failed to import — invalid JSON file', 'error');
            }
        };
        input.click();
    };

    return (
        <div className="app-layout">
            <Sidebar />
            <main className="main-content">
                <div className="page-container">
                    <div className="page-header">
                        <h2>Settings</h2>
                        <p>Configure API authentication and view system information</p>
                    </div>

                    {/* Central API Token */}
                    <div className="section-title">ZeroTier Central API Token</div>
                    <div className="card" style={{ marginBottom: 24 }}>
                        <div className="help-box" style={{ marginBottom: 16 }}>
                            <div className="help-title">💡 How to get your API token</div>
                            1. Go to <a href="https://my.zerotier.com" target="_blank" rel="noopener noreferrer">my.zerotier.com</a> and log in<br />
                            2. Click your account icon → <strong>Account</strong><br />
                            3. Scroll to <strong>API Access Tokens</strong> and create one<br />
                            4. Copy the token and paste it below
                        </div>

                        <div className="form-group">
                            <label className="label">API Token</label>
                            <div style={{ display: 'flex', gap: 8, maxWidth: 500 }}>
                                <input
                                    className="input"
                                    type={showToken ? 'text' : 'password'}
                                    value={token}
                                    onChange={e => setToken(e.target.value)}
                                    placeholder="Paste your Central API token..."
                                    style={{ fontFamily: 'var(--font-mono)' }}
                                />
                                <button className="btn btn-ghost" onClick={() => setShowToken(!showToken)}>
                                    {showToken ? '🙈' : '👁️'}
                                </button>
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                            <button className="btn btn-primary" onClick={handleSave} disabled={!token}>💾 Save</button>
                            <button className="btn btn-secondary" onClick={handleTest} disabled={!token}>🔧 Test Connection</button>
                            {savedToken && <button className="btn btn-danger" onClick={handleClear}>🗑️ Clear</button>}
                        </div>

                        {testResult === 'testing' && <div style={{ marginTop: 12, color: 'var(--text-secondary)' }}>Testing...</div>}
                        {testResult === 'success' && <div className="help-box success" style={{ marginTop: 12 }}>✅ {testMessage}</div>}
                        {testResult === 'error' && <div className="help-box danger" style={{ marginTop: 12 }}>❌ {testMessage}</div>}
                    </div>

                    {/* User Info */}
                    {userInfo && (
                        <>
                            <div className="section-title">Central API Account</div>
                            <div className="card" style={{ marginBottom: 24 }}>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24 }}>
                                    <div><span className="label">Display Name</span> <strong>{userInfo.displayName as string || '—'}</strong></div>
                                    <div><span className="label">Email</span> {userInfo.email as string || '—'}</div>
                                    <div><span className="label">User ID</span> <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{userInfo.id as string || '—'}</span></div>
                                </div>
                            </div>
                        </>
                    )}

                    {/* Local Node */}
                    <div className="section-title">Local Node Information</div>
                    <div className="card" style={{ marginBottom: 24 }}>
                        {nodeInfo ? (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24 }}>
                                <div>
                                    <span className="label">Node ID</span>
                                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 14, color: 'var(--accent-primary)' }}>{nodeInfo.address as string}</div>
                                </div>
                                <div>
                                    <span className="label">Status</span>
                                    <span className={`badge ${nodeInfo.online ? 'badge-green' : 'badge-red'}`}>
                                        <span className={`status-dot ${nodeInfo.online ? 'online' : 'offline'}`} />
                                        {nodeInfo.online ? 'Online' : 'Offline'}
                                    </span>
                                </div>
                                <div><span className="label">Version</span> {nodeInfo.version as string}</div>
                                <div><span className="label">Clock</span> {nodeInfo.clock ? new Date(nodeInfo.clock as number).toLocaleString() : '—'}</div>
                                <div>
                                    <span className="label">Cluster Node</span>
                                    <span className={`badge ${nodeInfo.cluster ? 'badge-green' : 'badge-gray'}`}>{nodeInfo.cluster ? 'Yes' : 'No'}</span>
                                </div>
                            </div>
                        ) : (
                            <div style={{ color: 'var(--text-secondary)' }}>
                                ⚠️ Cannot reach local ZeroTier service. Make sure ZeroTier is installed and running.
                            </div>
                        )}
                    </div>

                    {/* Data Management */}
                    <div className="section-title">Data Management</div>
                    <div className="card">
                        <div className="help-box warning" style={{ marginBottom: 12 }}>
                            <div className="help-title">⚠️ Local Storage</div>
                            Device registry and intrusion events are stored in your browser&apos;s localStorage.
                            Clearing browser data will erase this information. Use the export button to create a backup.
                        </div>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                            <button className="btn btn-secondary" onClick={handleExportDevices}>
                                📥 Export Device Data
                            </button>
                            <button className="btn btn-secondary" onClick={handleImportDevices}>
                                📤 Import Device Data
                            </button>
                            <button className="btn btn-danger" onClick={() => {
                                if (confirm('Clear ALL locally stored device data and intrusion events? This cannot be undone.')) {
                                    localStorage.removeItem('zt-known-devices');
                                    localStorage.removeItem('zt-intrusion-events');
                                    logAction('data_clear', 'settings', 'Cleared device registry and intrusion events');
                                    addToast('Local data cleared', 'success');
                                }
                            }}>
                                🗑️ Clear Device Data
                            </button>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
