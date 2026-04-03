import { useWidgetData } from '../../hooks/useWidgetData';
import { timeAgo } from '../../lib/time';
import { Badge } from '../ui/badge';
import type { WidgetDimensions } from '../../lib/widget-size';
import type { FeedResponse, FeedItem } from '../../types';

function DigestItem({ item, compact }: { item: FeedItem; compact?: boolean }) {
  const score = item.score != null ? Math.round(item.score * 10) / 10 : 0;
  const scorePercent = Math.min(100, Math.round((score / 10) * 100));

  if (compact) {
    return (
      <div className="flex items-center gap-2 py-1 border-b border-border last:border-0">
        <span className="text-[0.65rem] font-bold text-primary min-w-[1.5rem]">{score}</span>
        <a
          href={item.url ?? undefined}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-foreground hover:text-primary truncate no-underline flex-1"
        >
          {item.title}
        </a>
      </div>
    );
  }

  return (
    <div className="relative p-2.5 bg-muted rounded-md border-l-[3px] border-l-primary transition-colors hover:bg-accent/50 overflow-hidden">
      <div
        className="absolute top-0 left-0 h-full flex items-center px-2 z-0"
        style={{
          width: `${scorePercent}%`,
          background: 'linear-gradient(90deg, rgba(108, 140, 255, 0.15), transparent)',
        }}
      >
        <span className="text-[0.65rem] font-bold text-primary relative z-10">{score}</span>
      </div>
      <div className="relative z-10">
        <h4 className="text-xs font-medium leading-snug mb-0.5">
          {item.url ? (
            <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-foreground hover:text-primary no-underline">{item.title}</a>
          ) : item.title}
        </h4>
        {item.summary && <p className="text-[0.7rem] text-muted-foreground leading-snug mb-1">{item.summary}</p>}
        <div className="flex gap-2 items-center text-[0.6rem]">
          <span className="text-primary bg-primary/10 px-1 py-0.5 rounded uppercase tracking-wide font-medium">{item.source}</span>
          <span className="text-muted-foreground">{item.published_at ? timeAgo(item.published_at) : timeAgo(item.collected_at)}</span>
        </div>
      </div>
    </div>
  );
}

interface Props { dims?: WidgetDimensions }

export default function Digest({ dims }: Props) {
  const { data, loading, error } = useWidgetData<FeedResponse>('/api/feed/digest?limit=10', 120000);
  const size = dims?.size ?? 'medium';

  if (loading) return <div className="flex-1 flex items-center justify-center text-muted-foreground text-xs">Loading digest...</div>;
  if (error) return <div className="flex-1 flex items-center justify-center text-destructive text-xs">Error: {error}</div>;
  if (!data || data.items.length === 0) {
    return <div className="flex-1 flex items-center justify-center text-muted-foreground text-xs">No digest items yet</div>;
  }

  if (size === 'compact') {
    return (
      <div className="flex flex-col overflow-hidden h-full">
        <h2 className="text-[0.65rem] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Digest</h2>
        {data.items.slice(0, 2).map((item) => <DigestItem key={item.id} item={item} compact />)}
      </div>
    );
  }

  const showCompact = size === 'small';
  const maxItems = size === 'small' ? 5 : 10;

  return (
    <div className="flex flex-col overflow-hidden h-full">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Digest</h2>
        <Badge variant="secondary" className="text-[0.6rem] px-1.5 py-0">{data.items.length}</Badge>
      </div>
      <div className="flex-1 overflow-y-auto flex flex-col gap-1.5">
        {data.items.slice(0, maxItems).map((item) => (
          <DigestItem key={item.id} item={item} compact={showCompact} />
        ))}
      </div>
    </div>
  );
}
