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

function sourceLabel(source: string): string {
  if (source.startsWith('rss:')) return source.slice(4).replace(/-/g, ' ');
  return source;
}

function FeedItemCard({ item }: { item: FeedItem }) {
  const score = item.score != null ? Math.round(item.score * 10) / 10 : null;

  return (
    <div className="feed-item">
      <div className="feed-item-header">
        <span className="feed-source">{sourceLabel(item.source)}</span>
        <span className="feed-time">
          {item.published_at ? timeAgo(item.published_at) : timeAgo(item.collected_at)}
        </span>
        {score !== null && <span className="feed-score" title="Relevance score">{score}</span>}
      </div>
      <h3 className="feed-title">
        {item.url ? (
          <a href={item.url} target="_blank" rel="noopener noreferrer">
            {item.title}
          </a>
        ) : (
          item.title
        )}
      </h3>
      {item.summary && <p className="feed-summary">{item.summary}</p>}
      {item.tags.length > 0 && (
        <div className="feed-tags">
          {item.tags.map((tag) => (
            <span key={tag} className="feed-tag">{tag}</span>
          ))}
        </div>
      )}
      {item.metadata && (item.metadata as Record<string, unknown>).score != null && (
        <span className="feed-meta">
          {(item.metadata as Record<string, unknown>).score as number} pts
          {' · '}
          {(item.metadata as Record<string, unknown>).comments as number ?? 0} comments
        </span>
      )}
    </div>
  );
}

export default function NewsFeed() {
  const { data, loading, error } = useWidgetData<FeedResponse>('/api/feed?limit=50', 60000);

  if (loading) return <div className="widget-loading">Loading feed...</div>;
  if (error) return <div className="widget-error">Error: {error}</div>;
  if (!data || data.items.length === 0) {
    return (
      <div className="widget-empty">
        <p>No items yet. Collectors are running — check back soon!</p>
      </div>
    );
  }

  return (
    <div className="news-feed">
      <div className="widget-header">
        <h2>Feed</h2>
        <span className="widget-count">{data.count} items</span>
      </div>
      <div className="feed-list">
        {data.items.map((item) => (
          <FeedItemCard key={item.id} item={item} />
        ))}
      </div>
    </div>
  );
}
