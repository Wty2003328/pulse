import { useState } from 'react';
import { useWidgetData } from '../../hooks/useWidgetData';
import { timeAgo } from '../../lib/time';
import { itemsForHeight } from '../../lib/widget-size';
import { Badge } from '../ui/badge';
import { ExternalLink } from 'lucide-react';
import type { WidgetDimensions } from '../../lib/widget-size';
import type { FeedResponse, FeedItem } from '../../types';

function stripHtml(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return doc.body.textContent || '';
}

function DigestItem({ item, compact }: { item: FeedItem; compact?: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const score = item.score != null ? Math.round(item.score * 10) / 10 : 0;
  const scorePercent = Math.min(100, Math.round((score / 10) * 100));
  const hasContent = !!(item.content || item.summary);

  if (compact) {
    return (
      <div className="flex items-center gap-2 py-1 border-b border-border last:border-0">
        <span className="text-[0.65rem] font-bold text-primary min-w-[1.5rem]">{score}</span>
        <a href={item.url ?? undefined} target="_blank" rel="noopener noreferrer"
          className="text-xs text-foreground hover:text-primary truncate no-underline flex-1">
          {item.title}
        </a>
      </div>
    );
  }

  return (
    <div className="relative rounded-md border-l-[3px] border-l-primary transition-colors hover:bg-accent/50 overflow-hidden">
      <div
        className={`p-2.5 ${hasContent ? 'cursor-pointer' : ''}`}
        onClick={() => hasContent && setExpanded(!expanded)}
      >
        <div className="absolute top-0 left-0 h-full flex items-center px-2 z-0"
          style={{ width: `${scorePercent}%`, background: 'linear-gradient(90deg, rgba(108,140,255,0.15), transparent)' }}>
          <span className="text-[0.65rem] font-bold text-primary relative z-10">{score}</span>
        </div>
        <div className="relative z-10">
          <h4 className="text-xs font-medium leading-snug mb-0.5">{item.title}</h4>
          <div className="flex gap-2 items-center text-[0.6rem]">
            <span className="text-primary bg-primary/10 px-1 py-0.5 rounded uppercase tracking-wide font-medium">{item.source}</span>
            <span className="text-muted-foreground">{item.published_at ? timeAgo(item.published_at) : timeAgo(item.collected_at)}</span>
          </div>
        </div>
      </div>
      {expanded && (
        <div className="px-3 pb-2.5 border-t border-border pt-2">
          {item.summary && <p className="text-xs text-muted-foreground leading-relaxed mb-2 italic">{item.summary}</p>}
          {item.content && (
            <div className="text-xs text-foreground/80 leading-relaxed max-h-40 overflow-y-auto mb-2">
              {stripHtml(item.content).slice(0, 600)}{stripHtml(item.content).length > 600 && '...'}
            </div>
          )}
          {item.url && (
            <a href={item.url} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-primary hover:underline" onClick={(e) => e.stopPropagation()}>
              Read full article <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
      )}
    </div>
  );
}

interface Props { dims?: WidgetDimensions }

export default function Digest({ dims }: Props) {
  const { data, loading, error } = useWidgetData<FeedResponse>('/api/feed/digest?limit=10', 120000);
  const size = dims?.size ?? 'medium';
  const h = dims?.h ?? 3;
  const rh = dims?.rowHeightPx ?? 100;

  if (loading) return <div className="flex-1 flex items-center justify-center text-muted-foreground text-xs">Loading digest...</div>;
  if (error) return <div className="flex-1 flex items-center justify-center text-destructive text-xs">Error: {error}</div>;
  if (!data || data.items.length === 0) {
    return <div className="flex-1 flex items-center justify-center text-muted-foreground text-xs">No digest items yet</div>;
  }

  const showCompact = size === 'compact' || size === 'small';
  const perItemPx = showCompact ? 28 : 56;
  const maxItems = Math.min(10, itemsForHeight(h, rh, perItemPx));

  return (
    <div className="flex flex-col overflow-hidden h-full">
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Digest</h2>
        <Badge variant="secondary" className="text-[0.6rem] px-1.5 py-0">{data.items.length}</Badge>
      </div>
      <div className="flex-1 overflow-y-auto flex flex-col gap-1">
        {data.items.slice(0, maxItems).map((item) => (
          <DigestItem key={item.id} item={item} compact={showCompact} />
        ))}
      </div>
    </div>
  );
}
