'use client';

import { useState } from 'react';
import Sidebar from '@/components/Sidebar';
import { runDiagnostics, getCentralToken } from '@/lib/api-client';

interface DiagIssue {
    id: string;
    severity: 'critical' | 'warning' | 'info';
    category: string;
    title: string;
    description: string;
    recommendation: string;
    affectedNode?: string;
    affectedNetwork?: string;
}

interface DiagReport {
    timestamp: number;
    nodeStatus: Record<string, unknown> | null;
    issues: DiagIssue[];
    summary: {
        critical: number;
        warning: number;
        info: number;
        totalPeers: number;
        relayedPeers: number;
        directPeers: number;
        avgLatency: number;
    };
}

export default function DiagnosticsPage() {
    const [report, setReport] = useState<DiagReport | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleRun = async () => {
        setLoading(true);
        setError('');
        try {
            const token = getCentralToken();
            const r = await runDiagnostics(token || undefined);
            setReport(r);
        } catch (err) {
            setError(err instanceof Error ? err.message : String(err));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="app-layout">
            <Sidebar />
            <main className="main-content">
                <div className="page-container">
                    <div className="page-header">
                        <h2>Network Diagnostics</h2>
                        <p>Run a comprehensive health check on your ZeroTier infrastructure</p>
                        <div className="header-actions">
                            <button className="btn btn-primary" onClick={handleRun} disabled={loading}>
                                {loading ? '🔄 Running...' : '🔧 Run Diagnostics'}
                            </button>
                        </div>
                    </div>

                    <div className="help-box">
                        <div className="help-title">💡 What does this check?</div>
                        The diagnostics engine inspects your local node, all connected peers, and (if your API token is set) all Central API networks.
                        It checks for: <strong>offline nodes</strong>, <strong>relayed connections</strong>, <strong>high latency</strong> (&gt;200ms),
                        <strong>symmetric NAT</strong>, <strong>IP conflicts</strong>, <strong>unauthorized members</strong>,
                        <strong>version mismatches</strong>, <strong>TCP fallback</strong>, <strong>stale peers</strong>, and more.
                        Results include specific recommendations.
                    </div>

                    {error && <div className="help-box danger">{error}</div>}

                    {report && (
                        <>
                            <div className="stat-grid">
                                <div className="stat-card accent-red">
                                    <div className="stat-icon">🔴</div>
                                    <div className="stat-value">{report.summary.critical}</div>
                                    <div className="stat-label">Critical</div>
                                </div>
                                <div className="stat-card accent-amber">
                                    <div className="stat-icon">🟡</div>
                                    <div className="stat-value">{report.summary.warning}</div>
                                    <div className="stat-label">Warnings</div>
                                </div>
                                <div className="stat-card accent-blue">
                                    <div className="stat-icon">🔵</div>
                                    <div className="stat-value">{report.summary.info}</div>
                                    <div className="stat-label">Info</div>
                                </div>
                                <div className="stat-card accent-green">
                                    <div className="stat-icon">⏱️</div>
                                    <div className="stat-value">{report.summary.avgLatency}ms</div>
                                    <div className="stat-label">Avg Latency</div>
                                </div>
                                <div className="stat-card accent-cyan">
                                    <div className="stat-icon">✅</div>
                                    <div className="stat-value">{report.summary.directPeers}/{report.summary.totalPeers}</div>
                                    <div className="stat-label">Direct / Total Peers</div>
                                </div>
                            </div>

                            {report.issues.length === 0 ? (
                                <div className="card">
                                    <div className="empty-state">
                                        <div className="empty-icon">✅</div>
                                        <h3>All Clear!</h3>
                                        <p>No issues found. Your ZeroTier network looks healthy.</p>
                                    </div>
                                </div>
                            ) : (
                                <div className="card" style={{ padding: 0 }}>
                                    {report.issues
                                        .sort((a, b) => {
                                            const order = { critical: 0, warning: 1, info: 2 };
                                            return order[a.severity] - order[b.severity];
                                        })
                                        .map((issue, i) => (
                                            <div key={i} className="alert-item">
                                                <div className={`alert-severity ${issue.severity}`} />
                                                <div className="alert-content">
                                                    <div className="alert-title">
                                                        {issue.title}
                                                    </div>
                                                    <div className="alert-desc">{issue.description}</div>
                                                    {issue.recommendation && <div style={{ marginTop: 4, fontSize: 12, color: 'var(--text-secondary)' }}>💡 {issue.recommendation}</div>}
                                                    {(issue.affectedNode || issue.affectedNetwork) && (
                                                        <div style={{ marginTop: 4, display: 'flex', gap: 8 }}>
                                                            {issue.affectedNode && <span className="badge badge-gray" style={{ fontFamily: 'var(--font-mono)', fontSize: 10 }}>Node: {issue.affectedNode}</span>}
                                                            {issue.affectedNetwork && <span className="badge badge-blue" style={{ fontFamily: 'var(--font-mono)', fontSize: 10 }}>Net: {issue.affectedNetwork}</span>}
                                                        </div>
                                                    )}
                                                </div>
                                                <div>
                                                    <span className={`badge badge-${issue.severity === 'critical' ? 'red' : issue.severity === 'warning' ? 'amber' : 'blue'}`}>
                                                        {issue.severity}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                </div>
                            )}

                            <div style={{ marginTop: 16, fontSize: 12, color: 'var(--text-muted)' }}>
                                Report generated at {new Date(report.timestamp).toLocaleString()}
                            </div>
                        </>
                    )}

                    {!report && !loading && (
                        <div className="card">
                            <div className="empty-state">
                                <div className="empty-icon">🔧</div>
                                <h3>Ready to Diagnose</h3>
                                <p>Click &quot;Run Diagnostics&quot; to check for connectivity issues, misconfigurations, and security concerns across your ZeroTier networks.</p>
                            </div>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
