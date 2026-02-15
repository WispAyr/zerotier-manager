'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { getIntrusionEvents } from '@/lib/device-registry';
import { useTheme } from '@/components/ThemeProvider';

const navSections = [
    {
        title: 'Overview',
        items: [
            { href: '/', icon: '📊', label: 'Dashboard' },
            { href: '/map', icon: '🗺️', label: 'Network Map' },
            { href: '/traffic', icon: '📈', label: 'Traffic' },
        ],
    },
    {
        title: 'Management',
        items: [
            { href: '/networks', icon: '🌐', label: 'Networks' },
            { href: '/members', icon: '👥', label: 'Members' },
            { href: '/peers', icon: '🔗', label: 'Peers' },
            { href: '/compare', icon: '⚖️', label: 'Compare' },
        ],
    },
    {
        title: 'Security',
        items: [
            { href: '/devices', icon: '🏷️', label: 'Device Registry' },
            { href: '/alerts', icon: '🛡️', label: 'Intrusion Alerts', badgeKey: 'alerts' },
            { href: '/rules', icon: '📋', label: 'Flow Rules' },
        ],
    },
    {
        title: 'Tools',
        items: [
            { href: '/diagnostics', icon: '🔧', label: 'Diagnostics' },
            { href: '/dns', icon: '🌍', label: 'DNS Config' },
            { href: '/knowledge', icon: '📚', label: 'Knowledge Base' },
        ],
    },
    {
        title: 'System',
        items: [
            { href: '/audit', icon: '📝', label: 'Audit Log' },
            { href: '/settings', icon: '⚙️', label: 'Settings' },
        ],
    },
];

export default function Sidebar() {
    const pathname = usePathname();
    const [alertCount, setAlertCount] = useState(0);
    const [mobileOpen, setMobileOpen] = useState(false);
    const { theme, toggleTheme } = useTheme();

    useEffect(() => {
        const events = getIntrusionEvents();
        setAlertCount(events.filter(e => !e.acknowledged).length);
        const interval = setInterval(() => {
            const events = getIntrusionEvents();
            setAlertCount(events.filter(e => !e.acknowledged).length);
        }, 5000);
        return () => clearInterval(interval);
    }, []);

    // Close mobile menu on route change
    useEffect(() => {
        setMobileOpen(false);
    }, [pathname]);

    return (
        <>
            {/* Mobile hamburger */}
            <button
                className="mobile-menu-btn"
                onClick={() => setMobileOpen(!mobileOpen)}
                aria-label="Toggle menu"
            >
                <span className={`hamburger ${mobileOpen ? 'open' : ''}`}>
                    <span /><span /><span />
                </span>
            </button>

            {/* Mobile overlay */}
            {mobileOpen && <div className="mobile-overlay" onClick={() => setMobileOpen(false)} />}

            <aside className={`sidebar ${mobileOpen ? 'open' : ''}`}>
                <div className="sidebar-logo">
                    <h1>
                        <span className="logo-icon">⚡</span>
                        ZeroTier Manager
                    </h1>
                    <div className="version">v1.0.0</div>
                </div>
                <nav className="sidebar-nav">
                    {navSections.map((section) => (
                        <div key={section.title} className="nav-section">
                            <div className="nav-section-title">{section.title}</div>
                            {section.items.map((item) => {
                                const isActive = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
                                return (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        className={`nav-link ${isActive ? 'active' : ''}`}
                                    >
                                        <span className="nav-icon">{item.icon}</span>
                                        {item.label}
                                        {'badgeKey' in item && item.badgeKey === 'alerts' && alertCount > 0 && (
                                            <span className="nav-badge">{alertCount}</span>
                                        )}
                                    </Link>
                                );
                            })}
                        </div>
                    ))}
                </nav>

                {/* Bottom controls */}
                <div className="sidebar-footer">
                    <button className="nav-link theme-toggle" onClick={toggleTheme} title="Toggle theme">
                        <span className="nav-icon">{theme === 'dark' ? '🌙' : '☀️'}</span>
                        {theme === 'dark' ? 'Dark Mode' : 'Light Mode'}
                    </button>
                    <div className="shortcut-hint">
                        Press <kbd className="kbd">?</kbd> for shortcuts
                    </div>
                </div>
            </aside>
        </>
    );
}
