'use client';

import { useState, useEffect, useCallback } from 'react';
import Sidebar from '@/components/Sidebar';
import { centralApi, serviceApi, getCentralToken, runDiagnostics } from '@/lib/api-client';
import { getIntrusionEvents, detectIntrusions, type MemberSnapshot } from '@/lib/device-registry';
import { useToast } from '@/components/Toast';
import { SkeletonStatGrid, SkeletonTable } from '@/components/Skeleton';

interface NetworkSummary {
  id: string;
  name: string;
  online: number;
  authorized: number;
  total: number;
}

export default function DashboardPage() {
  const { addToast } = useToast();
  const [nodeStatus, setNodeStatus] = useState<Record<string, unknown> | null>(null);
  const [networks, setNetworks] = useState<NetworkSummary[]>([]);
  const [peers, setPeers] = useState<Record<string, unknown>[]>([]);
  const [diagnosticSummary, setDiagnosticSummary] = useState<Record<string, unknown> | null>(null);
  const [alertCount, setAlertCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const token = getCentralToken();

    try {
      // Fetch local node status
      try {
        const status = await serviceApi.getStatus();
        setNodeStatus(status);
      } catch { /* Service may not be running */ }

      // Fetch peers
      try {
        const p = await serviceApi.getPeers();
        setPeers(Array.isArray(p) ? p : []);
      } catch { /* Service may not be running */ }

      // Fetch networks from Central API
      if (token) {
        try {
          const nets = await centralApi.listNetworks(token);
          const summaries: NetworkSummary[] = (nets || []).map((n: Record<string, unknown>) => ({
            id: n.id as string,
            name: (n.config as Record<string, unknown>)?.name as string || n.id as string,
            online: n.onlineMemberCount as number || 0,
            authorized: n.authorizedMemberCount as number || 0,
            total: n.totalMemberCount as number || 0,
          }));
          setNetworks(summaries);

          // Run intrusion detection
          const allMembers: MemberSnapshot[] = [];
          for (const net of summaries.slice(0, 5)) { // Limit to first 5 networks
            try {
              const members = await centralApi.listMembers(token, net.id);
              for (const m of members || []) {
                allMembers.push({
                  nodeId: m.nodeId || m.config?.address || '',
                  networkId: net.id,
                  networkName: net.name,
                  authorized: m.config?.authorized || false,
                  physicalAddress: m.physicalAddress || '',
                  clientVersion: m.clientVersion || '',
                  ipAssignments: m.config?.ipAssignments || [],
                  lastOnline: m.lastOnline || 0,
                  name: m.name || '',
                });
              }
            } catch { /* Skip on error */ }
          }
          if (allMembers.length > 0) {
            detectIntrusions(allMembers);
          }
        } catch { /* Central API may not be configured */ }

        // Diagnostics summary
        try {
          const diag = await runDiagnostics(token);
          setDiagnosticSummary(diag?.summary || null);
        } catch { /* Diagnostics may fail */ }
      }

      // Update alert count
      const events = getIntrusionEvents();
      setAlertCount(events.filter(e => !e.acknowledged).length);

    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to load data', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
    const interval = setInterval(fetchAll, 30000);
    return () => clearInterval(interval);
  }, [fetchAll]);

  const token = typeof window !== 'undefined' ? getCentralToken() : null;
  const directPeers = peers.filter(p => (p.paths as unknown[])?.length > 0 && p.role === 'LEAF');
  const relayedPeers = peers.filter(p => (!(p.paths as unknown[])?.length || (p.paths as unknown[])?.length === 0) && p.role === 'LEAF');
  const totalMembers = networks.reduce((sum, n) => sum + n.total, 0);
  const onlineMembers = networks.reduce((sum, n) => sum + n.online, 0);

  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
        <div className="page-container">
          <div className="page-header">
            <h2>Dashboard</h2>
            <p>Real-time overview of your ZeroTier infrastructure</p>
          </div>

          {!token && (
            <div className="help-box warning" style={{ marginBottom: 20 }}>
              <div className="help-title">⚠️ API Token Required</div>
              No Central API token configured. Go to <a href="/settings">Settings</a> to add your token for full functionality.
            </div>
          )}



          {/* ── Stat Cards ──────────────────────────────────── */}
          {loading ? <SkeletonStatGrid count={4} /> : <div className="stat-grid">
            <div className="stat-card accent-amber">
              <div className="stat-icon">🌐</div>
              <div className="stat-value">{networks.length}</div>
              <div className="stat-label">Networks</div>
            </div>
            <div className="stat-card accent-green">
              <div className="stat-icon">👥</div>
              <div className="stat-value">{onlineMembers}/{totalMembers}</div>
              <div className="stat-label">Members Online</div>
            </div>
            <div className="stat-card accent-blue">
              <div className="stat-icon">🔗</div>
              <div className="stat-value">{directPeers.length}</div>
              <div className="stat-label">Direct Peers</div>
            </div>
            <div className="stat-card accent-purple">
              <div className="stat-icon">🔄</div>
              <div className="stat-value">{relayedPeers.length}</div>
              <div className="stat-label">Relayed Peers</div>
            </div>
            {diagnosticSummary && (
              <>
                <div className="stat-card accent-red">
                  <div className="stat-icon">⚠️</div>
                  <div className="stat-value">{(diagnosticSummary.critical as number) + (diagnosticSummary.warning as number)}</div>
                  <div className="stat-label">Issues Found</div>
                </div>
                <div className="stat-card accent-cyan">
                  <div className="stat-icon">🛡️</div>
                  <div className="stat-value">{alertCount}</div>
                  <div className="stat-label">Security Alerts</div>
                </div>
              </>
            )}
          </div>}

          {/* ── Node Status ─────────────────────────────────── */}
          {nodeStatus && (
            <>
              <div className="section-title">Local Node</div>
              <div className="card" style={{ marginBottom: 24 }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24 }}>
                  <div>
                    <div className="label">Node ID</div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 14, color: 'var(--accent-primary)' }}>
                      {nodeStatus.address as string}
                    </div>
                  </div>
                  <div>
                    <div className="label">Status</div>
                    <span className={`badge ${nodeStatus.online ? 'badge-green' : 'badge-red'}`}>
                      <span className={`status-dot ${nodeStatus.online ? 'online' : 'offline'}`} />
                      {nodeStatus.online ? 'Online' : 'Offline'}
                    </span>
                  </div>
                  <div>
                    <div className="label">Version</div>
                    <div style={{ fontSize: 14 }}>{nodeStatus.version as string}</div>
                  </div>
                  <div>
                    <div className="label">TCP Fallback</div>
                    <span className={`badge ${(nodeStatus.config as Record<string, unknown>)?.settings && ((nodeStatus.config as Record<string, unknown>).settings as Record<string, unknown>)?.tcpFallbackActive ? 'badge-amber' : 'badge-green'}`}>
                      {(nodeStatus.config as Record<string, unknown>)?.settings && ((nodeStatus.config as Record<string, unknown>).settings as Record<string, unknown>)?.tcpFallbackActive ? '⚠️ Active' : '✅ Not Active'}
                    </span>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* ── Networks Overview ───────────────────────────── */}
          <div className="section-title">Networks</div>
          {loading && networks.length === 0 ? (
            <SkeletonTable rows={3} />
          ) : networks.length === 0 ? (
            <div className="card">
              <div className="empty-state">
                <div className="empty-icon">🌐</div>
                <h3>No Networks</h3>
                <p>{token ? 'No networks found. Create one to get started.' : 'Configure your API token in Settings to see networks.'}</p>
                {token && <a href="/networks" className="btn btn-primary">Create Network</a>}
              </div>
            </div>
          ) : (
            <div className="table-container" style={{ marginBottom: 24 }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>Network</th>
                    <th>ID</th>
                    <th>Online</th>
                    <th>Authorized</th>
                    <th>Total</th>
                    <th>Health</th>
                  </tr>
                </thead>
                <tbody>
                  {networks.map(n => (
                    <tr key={n.id}>
                      <td style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{n.name}</td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12.5 }}>{n.id}</td>
                      <td>
                        <span className="badge badge-green">
                          <span className="status-dot online" />
                          {n.online}
                        </span>
                      </td>
                      <td>{n.authorized}</td>
                      <td>{n.total}</td>
                      <td>
                        {n.total - n.authorized > 0 ? (
                          <span className="badge badge-amber">⚠️ {n.total - n.authorized} unauthorized</span>
                        ) : (
                          <span className="badge badge-green">✅ Healthy</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* ── Recent Alerts ───────────────────────────────── */}
          {alertCount > 0 && (
            <>
              <div className="section-title">Recent Security Alerts</div>
              <div className="card" style={{ padding: 0 }}>
                {getIntrusionEvents()
                  .filter(e => !e.acknowledged)
                  .slice(-5)
                  .reverse()
                  .map(event => (
                    <div key={event.id} className="alert-item">
                      <div className={`alert-severity ${event.severity}`} />
                      <div className="alert-content">
                        <div className="alert-title">{event.type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</div>
                        <div className="alert-desc">{event.description}</div>
                      </div>
                      <div className="alert-time">{new Date(event.timestamp).toLocaleTimeString()}</div>
                    </div>
                  ))}
                {alertCount > 5 && (
                  <div style={{ padding: '8px 16px', textAlign: 'center' }}>
                    <a href="/alerts" className="btn btn-ghost btn-sm">View all {alertCount} alerts →</a>
                  </div>
                )}
              </div>
            </>
          )}

          {/* ── Quick Help ──────────────────────────────────── */}
          <div className="help-box" style={{ marginTop: 24 }}>
            <div className="help-title">💡 What is this dashboard?</div>
            This dashboard shows a real-time overview of your entire ZeroTier infrastructure — your networks, connected devices,
            peer connections, and security alerts. Data is refreshed every 30 seconds. Visit the{' '}
            <a href="/knowledge">Knowledge Base</a> to learn about any concept you see here.
          </div>
        </div>
      </main>
    </div>
  );
}
