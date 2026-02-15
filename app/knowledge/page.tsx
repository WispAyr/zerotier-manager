'use client';

import { useState, useMemo } from 'react';
import Sidebar from '@/components/Sidebar';
import { knowledgeBase, searchArticles, getArticleById, getAllCategories, categoryLabels, type KnowledgeArticle, type KnowledgeCategory } from '@/lib/knowledge';

export default function KnowledgePage() {
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [search, setSearch] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string>('all');

    const articles = useMemo((): KnowledgeArticle[] => {
        if (search) return searchArticles(search);
        return [...knowledgeBase];
    }, [search]);

    const categories = getAllCategories();
    const filtered = selectedCategory === 'all' ? articles : articles.filter(a => a.category === selectedCategory);
    const selected = selectedId ? getArticleById(selectedId) : null;

    return (
        <div className="app-layout">
            <Sidebar />
            <main className="main-content">
                <div className="page-container">
                    {selected ? (
                        <>
                            <button className="btn btn-ghost" onClick={() => setSelectedId(null)} style={{ marginBottom: 16 }}>
                                ← Back to Knowledge Base
                            </button>
                            <div className="card slide-up">
                                <div style={{ marginBottom: 16 }}>
                                    <span className="badge badge-amber" style={{ marginBottom: 8 }}>
                                        {categoryLabels[selected.category] || selected.category}
                                    </span>
                                </div>
                                <div className="kb-article-content" dangerouslySetInnerHTML={{ __html: formatContent(selected.content) }} />
                                {selected.relatedArticles && selected.relatedArticles.length > 0 && (
                                    <div style={{ marginTop: 24, paddingTop: 16, borderTop: '1px solid var(--border-subtle)' }}>
                                        <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Related Articles</h3>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                                            {selected.relatedArticles.map(id => {
                                                const related = getArticleById(id);
                                                if (!related) return null;
                                                return (
                                                    <button key={id} className="btn btn-secondary btn-sm" onClick={() => setSelectedId(id)}>
                                                        📄 {related.title}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="page-header">
                                <h2>Knowledge Base</h2>
                                <p>Learn ZeroTier concepts, troubleshoot issues, and master your network</p>
                            </div>

                            <div className="help-box">
                                <div className="help-title">📚 For Beginners</div>
                                New to ZeroTier? Start with &quot;What is ZeroTier?&quot; and &quot;Central API vs Service API&quot; articles below.
                                Each article is written in plain language with step-by-step instructions and real-world examples.
                            </div>

                            <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
                                <input className="input" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search articles..." style={{ maxWidth: 300 }} />
                                <select className="input" value={selectedCategory} onChange={e => setSelectedCategory(e.target.value)} style={{ maxWidth: 200 }}>
                                    <option value="all">All Categories</option>
                                    {categories.map(c => (
                                        <option key={c.category} value={c.category}>
                                            {categoryLabels[c.category]} ({c.count})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {filtered.length === 0 ? (
                                <div className="card">
                                    <div className="empty-state">
                                        <div className="empty-icon">📚</div>
                                        <h3>No Results</h3>
                                        <p>No articles match your search. Try a different term.</p>
                                    </div>
                                </div>
                            ) : (
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
                                    {filtered.map(article => (
                                        <div key={article.id} className="kb-card fade-in" onClick={() => setSelectedId(article.id)}>
                                            <div className="kb-category">{categoryLabels[article.category] || article.category}</div>
                                            <h4>{article.title}</h4>
                                            <p>{article.summary}</p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </>
                    )}
                </div>
            </main>
        </div>
    );
}

function formatContent(content: string): string {
    // Simple markdown-to-HTML conversion for article content
    let html = content
        // Code blocks (fenced)
        .replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
        // Inline code
        .replace(/`([^`]+)`/g, '<code>$1</code>')
        // Headers
        .replace(/^### (.*$)/gm, '<h3>$1</h3>')
        .replace(/^## (.*$)/gm, '<h2>$1</h2>')
        .replace(/^# (.*$)/gm, '<h1>$1</h1>')
        // Bold and italic
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        // List items
        .replace(/^- (.*$)/gm, '<li>$1</li>')
        // Tables (markdown pipe format)
        .replace(/\|([^\n]+)\|\n\|[-| ]+\|\n([\s\S]*?)(?=\n\n|$)/gm, (_match, header, body) => {
            const headerCells = (header as string).split('|').map((c: string) => `<th>${c.trim()}</th>`).join('');
            const rows = (body as string).trim().split('\n').map((row: string) => {
                const cells = row.split('|').filter((c: string) => c.trim()).map((c: string) => `<td>${c.trim()}</td>`).join('');
                return `<tr>${cells}</tr>`;
            }).join('');
            return `<table><thead><tr>${headerCells}</tr></thead><tbody>${rows}</tbody></table>`;
        })
        // Paragraphs
        .replace(/\n\n/g, '</p><p>');

    // Wrap consecutive <li> items in <ul>
    html = html.replace(/(<li>.*?<\/li>\n?)+/g, '<ul>$&</ul>');

    return `<p>${html}</p>`;
}
