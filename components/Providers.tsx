'use client';

import { ToastProvider } from '@/components/Toast';
import { ThemeProvider } from '@/components/ThemeProvider';
import { useKeyboardShortcuts } from '@/lib/keyboard';
import { type ReactNode } from 'react';

function KeyboardShortcutHandler({ children }: { children: ReactNode }) {
    const { showHelp, setShowHelp, gPressed, navigationShortcuts } = useKeyboardShortcuts();

    return (
        <>
            {children}
            {gPressed && (
                <div className="keyboard-indicator">
                    Press a key to navigate...
                </div>
            )}
            {showHelp && (
                <div className="modal-backdrop" onClick={() => setShowHelp(false)}>
                    <div className="modal slide-up" onClick={e => e.stopPropagation()} style={{ maxWidth: 480 }}>
                        <div className="modal-header">
                            <h3>⌨️ Keyboard Shortcuts</h3>
                            <button className="btn btn-ghost btn-sm" onClick={() => setShowHelp(false)}>×</button>
                        </div>
                        <div style={{ padding: 20 }}>
                            <div style={{ marginBottom: 16 }}>
                                <div className="label">Navigation (press G then a letter)</div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                                    {navigationShortcuts.map(s => (
                                        <div key={s.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13, padding: '4px 0' }}>
                                            <span style={{ color: 'var(--text-secondary)' }}>{s.description}</span>
                                            <kbd className="kbd">{s.label}</kbd>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: 12 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '4px 0' }}>
                                    <span style={{ color: 'var(--text-secondary)' }}>Show this help</span>
                                    <kbd className="kbd">?</kbd>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '4px 0' }}>
                                    <span style={{ color: 'var(--text-secondary)' }}>Close / Cancel</span>
                                    <kbd className="kbd">Esc</kbd>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

export default function Providers({ children }: { children: ReactNode }) {
    return (
        <ThemeProvider>
            <ToastProvider>
                <KeyboardShortcutHandler>
                    {children}
                </KeyboardShortcutHandler>
            </ToastProvider>
        </ThemeProvider>
    );
}
