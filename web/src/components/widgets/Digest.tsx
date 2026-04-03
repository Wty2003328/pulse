import { useWidgetData } from '../../hooks/useWidgetData';
import type { FeedResponse, FeedItem } from '../../types';

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffSec = Math.floor((now - then) / 1000);

  if (diffSec < 60) return 'just now';
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  return `${Math.floor(diffSec / 86400)}d ago`;
}

function DigestItem({ item }: { item: FeedItem }) {
  const score = item.score != null ? Math.round(item.score * 10) / 10 : 0;
  const scorePercent = Math.min(100, Math.round((score / 10) * 100));

  return (
    <div className="digest-item">
      <div className="digest-score-badge" style={{ width: `${scorePercent}%` }}>
        <span className="digest-score-text">{score}</span>
      </div>
      <div className="digest-content">
        <h4 className="digest-title">
          {item.url ? (
            <a href={item.url} target="_blank" rel="noopener noreferrer">
              {item.title}
            </a>
          ) : (
            item.title
          )}
        </h4>
        {item.summary && <p className="digest-summary">{item.summary}</p>}
        <div className="digest-meta">
          <span className="digest-source">{item.source}</span>
          <span className="digest-time">
            {item.published_at ? timeAgo(item.published_at) : timeAgo(item.collected_at)}
          </span>
        </div>
      </div>
    </div>
  );
}

export default function Digest() {
  const { data, loading, error } = useWidgetData<FeedResponse>(
    '/api/feed/digest?limit=10',
    120000
  );

  if (loading) return <div className="widget-loading">Loading digest...</div>;
  if (error) return <div className="widget-error">Error: {error}</div>;
  if (!data || data.items.length === 0) {
    return (
      <div className="widget-empty">
        <p>No digest items yet</p>
      </div>
    );
  }

  return (
    <div className="digest">
      <div className="widget-header">
        <h2>Digest</h2>
        <span className="widget-count">{data.items.length}</span>
      </div>
      <div className="digest-list">
        {data.items.slice(0, 10).map((item) => (
          <DigestItem key={item.id} item={item} />
        ))}
      </div>
    </div>
  );
}
