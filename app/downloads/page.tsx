'use client';

import { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import { serviceApi } from '@/lib/api-client';

interface Release {
    tag_name: string;
    name: string;
    published_at: string;
    html_url: string;
    assets: {
        name: string;
        browser_download_url: string;
        size: number;
    }[];
}

const PLATFORMS = [
    { id: 'windows', label: 'Windows', icon: '🪟', pattern: /\.msi$|\.exe$/i, description: 'Windows 10/11 installer' },
    { id: 'mac', label: 'macOS', icon: '🍎', pattern: /\.pkg$/i, description: 'macOS installer package' },
    { id: 'linux-deb', label: 'Linux (Debian/Ubuntu)', icon: '🐧', pattern: /\.deb$/i, description: '.deb package for apt' },
    { id: 'linux-rpm', label: 'Linux (RHEL/Fedora)', icon: '🐧', pattern: /\.rpm$/i, description: '.rpm package for dnf/yum' },
];

function formatSize(bytes: number) {
    if (bytes > 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    if (bytes > 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${bytes} B`;
}

export default function DownloadsPage() {
    const [release, setRelease] = useState<Release | null>(null);
    const [localVersion, setLocalVersion] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchRelease = async () => {
            try {
                const res = await fetch('https://api.github.com/repos/zerotier/ZeroTierOne/releases/latest');
                if (res.ok) {
                    const data = await res.json();
                    setRelease(data);
                } else {
                    setError('Could not fetch latest release info from GitHub');
                }
            } catch {
                setError('Could not connect to GitHub API');
            }

            try {
                const status = await serviceApi.getStatus();
                setLocalVersion(status?.version || null);
            } catch {
                // local service may be offline
            }

            setLoading(false);
        };
        fetchRelease();
    }, []);

    const latestVersion = release?.tag_name?.replace(/^v/, '') || '';
    const isOutdated = localVersion && latestVersion && localVersion !== latestVersion;

    return (
        <div className="app-layout">
            <Sidebar />
            <main className="main-content">
                <div className="page-container">
                    <div className="page-header">
                        <h2>Download ZeroTier</h2>
                        <p>Get the latest ZeroTier client for your platform</p>
                    </div>

                    {/* Version info */}
                    <div className="stat-grid" style={{ marginBottom: 24 }}>
                        <div className={`stat-card ${isOutdated ? 'accent-amber' : 'accent-green'}`}>
                            <div className="stat-icon">📦</div>
                            <div className="stat-value" style={{ fontSize: 18 }}>{localVersion || '—'}</div>
                            <div className="stat-label">Installed Version</div>
                        </div>
                        <div className="stat-card accent-blue">
                            <div className="stat-icon">🆕</div>
                            <div className="stat-value" style={{ fontSize: 18 }}>{latestVersion || '—'}</div>
                            <div className="stat-label">Latest Release</div>
                        </div>
                        <div className="stat-card accent-cyan">
                            <div className="stat-icon">📅</div>
                            <div className="stat-value" style={{ fontSize: 14 }}>
                                {release ? new Date(release.published_at).toLocaleDateString() : '—'}
                            </div>
                            <div className="stat-label">Release Date</div>
                        </div>
                    </div>

                    {isOutdated && (
                        <div className="help-box warning" style={{ marginBottom: 24 }}>
                            <div className="help-title">⚠️ Update Available</div>
                            You&apos;re running <strong>{localVersion}</strong> but <strong>{latestVersion}</strong> is available.
                            Download the latest version below.
                        </div>
                    )}

                    {!isOutdated && localVersion && latestVersion && (
                        <div className="help-box" style={{ marginBottom: 24 }}>
                            <div className="help-title">✅ Up to Date</div>
                            You&apos;re running the latest version of ZeroTier.
                        </div>
                    )}

                    {error && <div className="help-box danger" style={{ marginBottom: 24 }}>{error}</div>}

                    {loading ? (
                        <div className="card"><div className="empty-state"><div className="empty-icon">⏳</div><h3>Loading releases...</h3></div></div>
                    ) : release ? (
                        <>
                            {/* Platform downloads */}
                            <div className="section-title">Downloads — {release.name || release.tag_name}</div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16, marginBottom: 32 }}>
                                {PLATFORMS.map(platform => {
                                    const assets = release.assets.filter(a => platform.pattern.test(a.name));
                                    return (
                                        <div key={platform.id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                <span style={{ fontSize: 28 }}>{platform.icon}</span>
                                                <div>
                                                    <div style={{ fontWeight: 600, fontSize: 16 }}>{platform.label}</div>
                                                    <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{platform.description}</div>
                                                </div>
                                            </div>
                                            {assets.length > 0 ? (
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                                    {assets.map(asset => (
                                                        <a key={asset.name} href={asset.browser_download_url}
                                                            className="btn btn-primary btn-sm" style={{ textDecoration: 'none', textAlign: 'center' }}
                                                            download>
                                                            ⬇️ {asset.name} ({formatSize(asset.size)})
                                                        </a>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                                                    No pre-built package in this release.
                                                    <a href="https://www.zerotier.com/download/" target="_blank" rel="noopener noreferrer"
                                                        style={{ color: 'var(--accent-blue)', marginLeft: 4 }}>
                                                        Get from zerotier.com →
                                                    </a>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>

                            {/* All assets */}
                            <div className="section-title">All Release Assets ({release.assets.length})</div>
                            <div className="card" style={{ padding: 0 }}>
                                <table className="table">
                                    <thead>
                                        <tr>
                                            <th>File</th>
                                            <th>Size</th>
                                            <th></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {release.assets.map(asset => (
                                            <tr key={asset.name}>
                                                <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{asset.name}</td>
                                                <td>{formatSize(asset.size)}</td>
                                                <td style={{ textAlign: 'right' }}>
                                                    <a href={asset.browser_download_url} className="btn btn-secondary btn-sm"
                                                        style={{ textDecoration: 'none' }} download>
                                                        ⬇️ Download
                                                    </a>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Install instructions */}
                            <div className="section-title" style={{ marginTop: 24 }}>Installation Instructions</div>
                            <div className="card">
                                <div style={{ display: 'grid', gap: 16 }}>
                                    <div>
                                        <strong>🐧 Linux (one-line install):</strong>
                                        <pre style={{ background: 'var(--bg-tertiary)', padding: 12, borderRadius: 8, marginTop: 8, overflowX: 'auto', fontSize: 13, fontFamily: 'var(--font-mono)' }}>
                                            curl -s https://install.zerotier.com | sudo bash
                                        </pre>
                                    </div>
                                    <div>
                                        <strong>🍺 macOS (Homebrew):</strong>
                                        <pre style={{ background: 'var(--bg-tertiary)', padding: 12, borderRadius: 8, marginTop: 8, overflowX: 'auto', fontSize: 13, fontFamily: 'var(--font-mono)' }}>
                                            brew install zerotier-one
                                        </pre>
                                    </div>
                                    <div>
                                        <strong>🐳 Docker:</strong>
                                        <pre style={{ background: 'var(--bg-tertiary)', padding: 12, borderRadius: 8, marginTop: 8, overflowX: 'auto', fontSize: 13, fontFamily: 'var(--font-mono)' }}>
                                            docker pull zerotier/zerotier
                                        </pre>
                                    </div>
                                </div>
                            </div>

                            {/* Links */}
                            <div style={{ marginTop: 24, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                                <a href={release.html_url} target="_blank" rel="noopener noreferrer" className="btn btn-secondary">
                                    📋 View Release Notes on GitHub
                                </a>
                                <a href="https://www.zerotier.com/download/" target="_blank" rel="noopener noreferrer" className="btn btn-secondary">
                                    🌐 Official Download Page
                                </a>
                                <a href="https://docs.zerotier.com/" target="_blank" rel="noopener noreferrer" className="btn btn-secondary">
                                    📖 Documentation
                                </a>
                            </div>
                        </>
                    ) : (
                        <div className="card">
                            <div className="empty-state">
                                <div className="empty-icon">📦</div>
                                <h3>Download from ZeroTier</h3>
                                <p>Visit the official download page for the latest installers.</p>
                                <a href="https://www.zerotier.com/download/" target="_blank" rel="noopener noreferrer" className="btn btn-primary" style={{ marginTop: 12 }}>
                                    Go to zerotier.com/download
                                </a>
                            </div>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
