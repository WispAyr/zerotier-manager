'use client';

import { useEffect, useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';

interface ShortcutDef {
    key: string;
    label: string;
    description: string;
}

const navigationShortcuts: ShortcutDef[] = [
    { key: 'd', label: 'G → D', description: 'Dashboard' },
    { key: 'm', label: 'G → M', description: 'Network Map' },
    { key: 't', label: 'G → T', description: 'Traffic' },
    { key: 'n', label: 'G → N', description: 'Networks' },
    { key: 'e', label: 'G → E', description: 'Members' },
    { key: 'p', label: 'G → P', description: 'Peers' },
    { key: 'v', label: 'G → V', description: 'Devices' },
    { key: 'a', label: 'G → A', description: 'Alerts' },
    { key: 'r', label: 'G → R', description: 'Rules' },
    { key: 'x', label: 'G → X', description: 'Diagnostics' },
    { key: 'o', label: 'G → O', description: 'DNS Config' },
    { key: 'k', label: 'G → K', description: 'Knowledge Base' },
    { key: 's', label: 'G → S', description: 'Settings' },
    { key: 'c', label: 'G → C', description: 'Compare Networks' },
    { key: 'l', label: 'G → L', description: 'Audit Log' },
];

const routeMap: Record<string, string> = {
    d: '/',
    m: '/map',
    t: '/traffic',
    n: '/networks',
    e: '/members',
    p: '/peers',
    v: '/devices',
    a: '/alerts',
    r: '/rules',
    x: '/diagnostics',
    o: '/dns',
    k: '/knowledge',
    s: '/settings',
    c: '/compare',
    l: '/audit',
};

export function useKeyboardShortcuts() {
    const router = useRouter();
    const [showHelp, setShowHelp] = useState(false);
    const [gPressed, setGPressed] = useState(false);

    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        // Ignore if typing in an input
        const tag = (e.target as HTMLElement).tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

        // ? to toggle help
        if (e.key === '?' && !e.ctrlKey && !e.metaKey) {
            e.preventDefault();
            setShowHelp(prev => !prev);
            return;
        }

        // Escape to close help
        if (e.key === 'Escape') {
            setShowHelp(false);
            setGPressed(false);
            return;
        }

        // G prefix for navigation
        if (e.key === 'g' && !gPressed && !e.ctrlKey && !e.metaKey) {
            setGPressed(true);
            setTimeout(() => setGPressed(false), 1500);
            return;
        }

        // After G is pressed, navigate
        if (gPressed) {
            const route = routeMap[e.key];
            if (route) {
                e.preventDefault();
                router.push(route);
            }
            setGPressed(false);
        }
    }, [gPressed, router]);

    useEffect(() => {
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [handleKeyDown]);

    return { showHelp, setShowHelp, gPressed, navigationShortcuts };
}
