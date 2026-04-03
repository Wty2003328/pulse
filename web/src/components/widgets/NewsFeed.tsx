import { useWidgetData } from '../../hooks/useWidgetData';
import { timeAgo } from '../../lib/time';
import { Badge } from '../ui/badge';
import type { WidgetDimensions } from '../../lib/widget-size';
import type { FeedResponse, FeedItem } from '../../types';

function sourceLabel(source: string): string {
  if (source.startsWith('rss:')) return source.slice(4).replace(/-/g, ' ');
  return source;
}

function CompactFeedItem({ item }: { item: FeedItem }) {
  return (
    <a
      href={item.url ?? undefined}
      target="_blank"
      rel="noopener noreferrer"
      className="block text-xs leading-snug text-foreground hover:text-primary truncate no-underline"
    >
      {item.title}
    </a>
  );
}

function SmallFeedItem({ item }: { item: FeedItem }) {
  return (
    <div className="py-1.5 border-b border-border last:border-0">
      <div className="flex items-center gap-1.5 mb-0.5">
        <span className="text-[0.6rem] font-semibold uppercase text-primary">{sourceLabel(item.source)}</span>
        <span className="text-[0.6rem] text-muted-foreground">{item.published_at ? timeAgo(item.published_at) : timeAgo(item.collected_at)}</span>
      </div>
      <a
        href={item.url ?? undefined}
        target="_blank"
        rel="noopener noreferrer"
        className="text-xs font-medium text-foreground hover:text-primary leading-snug line-clamp-2 no-underline"
      >
        {item.title}
      </a>
    </div>
  );
}

function FullFeedItem({ item }: { item: FeedItem }) {
  const score = item.score != null ? Math.round(item.score * 10) / 10 : null;

  return (
    <div className="px-3 py-2.5 rounded-lg transition-colors hover:bg-accent/50">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-[0.65rem] font-semibold uppercase tracking-wide text-primary bg-primary/10 px-1.5 py-0.5 rounded">
          {sourceLabel(item.source)}
        </span>
        <span className="text-[0.65rem] text-muted-foreground">
          {item.published_at ? timeAgo(item.published_at) : timeAgo(item.collected_at)}
        </span>
        {score !== null && (
          <span className="text-[0.6rem] font-bold text-success bg-success/10 px-1.5 py-0.5 rounded ml-auto">{score}</span>
        )}
      </div>
      <h3 className="text-sm font-medium leading-snug mb-0.5">
        {item.url ? (
          <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-foreground hover:text-primary no-underline">{item.title}</a>
        ) : item.title}
      </h3>
      {item.summary && <p className="text-xs text-muted-foreground leading-relaxed mb-1">{item.summary}</p>}
      {item.tags.length > 0 && (
        <div className="flex gap-1 flex-wrap">
          {item.tags.map((tag) => (
            <span key={tag} className="text-[0.6rem] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{tag}</span>
          ))}
        </div>
      )}
    </div>
  );
}

interface Props { dims?: WidgetDimensions }

export default function NewsFeed({ dims }: Props) {
  const { data, loading, error } = useWidgetData<FeedResponse>('/api/feed?limit=50', 60000);
  const size = dims?.size ?? 'large';

  if (loading) return <div className="flex-1 flex items-center justify-center text-muted-foreground text-xs">Loading feed...</div>;
  if (error) return <div className="flex-1 flex items-center justify-center text-destructive text-xs">Error: {error}</div>;
  if (!data || data.items.length === 0) {
    return <div className="flex-1 flex items-center justify-center text-muted-foreground text-xs">No items yet</div>;
  }

  if (size === 'compact') {
    return (
      <div className="flex flex-col gap-1 overflow-hidden h-full">
        <h2 className="text-[0.65rem] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Feed</h2>
        {data.items.slice(0, 3).map((item) => <CompactFeedItem key={item.id} item={item} />)}
      </div>
    );
  }

  if (size === 'small') {
    return (
      <div className="flex flex-col overflow-hidden h-full">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Feed</h2>
          <Badge variant="secondary" className="text-[0.6rem] px-1.5 py-0">{data.count}</Badge>
        </div>
        <div className="flex-1 overflow-y-auto">
          {data.items.slice(0, 6).map((item) => <SmallFeedItem key={item.id} item={item} />)}
        </div>
      </div>
    );
  }

  const maxItems = size === 'medium' ? 10 : 50;

  return (
    <div className="flex flex-col overflow-hidden h-full">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Feed</h2>
        <Badge variant="secondary" className="text-[0.6rem] px-1.5 py-0">{data.count} items</Badge>
      </div>
      <div className="flex-1 overflow-y-auto flex flex-col gap-0.5">
        {data.items.slice(0, maxItems).map((item) => <FullFeedItem key={item.id} item={item} />)}
      </div>
    </div>
  );
}
