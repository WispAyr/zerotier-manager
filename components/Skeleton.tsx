// Skeleton loading components for premium feel
export function SkeletonCard() {
    return (
        <div className="skeleton-card">
            <div className="skeleton skeleton-icon" />
            <div className="skeleton skeleton-line" style={{ width: '60%' }} />
            <div className="skeleton skeleton-line" style={{ width: '40%' }} />
        </div>
    );
}

export function SkeletonRow() {
    return (
        <div className="skeleton-row">
            <div className="skeleton skeleton-circle" />
            <div style={{ flex: 1 }}>
                <div className="skeleton skeleton-line" style={{ width: '70%' }} />
                <div className="skeleton skeleton-line" style={{ width: '45%', marginTop: 6 }} />
            </div>
            <div className="skeleton skeleton-badge" />
        </div>
    );
}

export function SkeletonTable({ rows = 5 }: { rows?: number }) {
    return (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div className="skeleton-table-header">
                {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="skeleton skeleton-line" style={{ width: `${60 + Math.random() * 40}px` }} />
                ))}
            </div>
            {Array.from({ length: rows }).map((_, i) => (
                <SkeletonRow key={i} />
            ))}
        </div>
    );
}

export function SkeletonStatGrid({ count = 4 }: { count?: number }) {
    return (
        <div className="stat-grid">
            {Array.from({ length: count }).map((_, i) => (
                <SkeletonCard key={i} />
            ))}
        </div>
    );
}
