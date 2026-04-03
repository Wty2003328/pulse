import { useState } from 'react';
import { useWidgetData } from '../../hooks/useWidgetData';
import { timeAgo } from '../../lib/time';
import { itemsForHeight } from '../../lib/widget-size';
import { Badge } from '../ui/badge';
import { ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';
import type { WidgetDimensions } from '../../lib/widget-size';
import type { FeedResponse, FeedItem } from '../../types';

function sourceLabel(source: string): string {
  if (source.startsWith('rss:')) return source.slice(4).replace(/-/g, ' ');
  return source;
}

function stripHtml(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return doc.body.textContent || '';
}

function FeedItemRow({ item, small }: { item: FeedItem; small?: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const hasContent = !!(item.content || item.summary);

  if (small) {
    return (
      <div className="py-1.5 border-b border-border/50 last:border-0">
        <div className="flex items-center gap-1.5 mb-0.5">
          <span className="text-[0.6rem] font-semibold uppercase text-primary">{sourceLabel(item.source)}</span>
          <span className="text-[0.6rem] text-muted-foreground">{item.published_at ? timeAgo(item.published_at) : timeAgo(item.collected_at)}</span>
        </div>
        <a href={item.url ?? undefined} target="_blank" rel="noopener noreferrer"
          className="text-xs font-medium text-foreground hover:text-primary leading-snug line-clamp-2 no-underline">
          {item.title}
        </a>
      </div>
    );
  }

  return (
    <div className="rounded-lg transition-colors hover:bg-accent/40">
      <div
        className={`px-3 py-2 ${hasContent ? 'cursor-pointer' : ''}`}
        onClick={() => hasContent && setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-[0.6rem] font-semibold uppercase tracking-wide text-primary bg-primary/10 px-1.5 py-0.5 rounded">
            {sourceLabel(item.source)}
          </span>
          <span className="text-[0.6rem] text-muted-foreground">
            {item.published_at ? timeAgo(item.published_at) : timeAgo(item.collected_at)}
          </span>
          {hasContent && (
            <span className="ml-auto">
              {expanded
                ? <ChevronUp className="w-3 h-3 text-muted-foreground" />
                : <ChevronDown className="w-3 h-3 text-muted-foreground" />}
            </span>
          )}
        </div>
        <h3 className="text-[0.85rem] font-medium leading-snug">{item.title}</h3>
      </div>

      {expanded && (
        <div className="px-3 pb-2.5 border-t border-border/50 pt-2 space-y-2">
          {item.summary && <p className="text-xs text-muted-foreground leading-relaxed italic">{item.summary}</p>}
          {item.content && (
            <div className="text-xs text-foreground/80 leading-relaxed max-h-48 overflow-y-auto">
              {stripHtml(item.content).slice(0, 1000)}
              {stripHtml(item.content).length > 1000 && '...'}
            </div>
          )}
          {item.url && (
            <a href={item.url} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
              onClick={(e) => e.stopPropagation()}>
              Open article <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
      )}
    </div>
  );
}

interface Props { dims?: WidgetDimensions }

export default function NewsFeed({ dims }: Props) {
  const { data, loading, error } = useWidgetData<FeedResponse>('/api/feed?limit=50', 60000);
  const size = dims?.size ?? 'large';
  const h = dims?.h ?? 4;
  const rh = dims?.rowHeightPx ?? 100;

  if (loading) return <div className="flex-1 flex items-center justify-center text-muted-foreground text-xs">Loading feed...</div>;
  if (error) return <div className="flex-1 flex items-center justify-center text-destructive text-xs">Error: {error}</div>;
  if (!data || data.items.length === 0) {
    return <div className="flex-1 flex items-center justify-center text-muted-foreground text-xs">No items yet</div>;
  }

  const isSmall = size === 'small';
  const perItemPx = isSmall ? 44 : 48;
  const maxItems = Math.min(50, itemsForHeight(h, rh, perItemPx));

  return (
    <div className="flex flex-col overflow-hidden h-full">
      <div className="flex items-center justify-between mb-1">
        <Badge variant="secondary" className="text-[0.6rem] px-1.5 py-0">{data.count} items</Badge>
      </div>
      <div className="flex-1 overflow-y-auto">
        {data.items.slice(0, maxItems).map((item) => (
          <FeedItemRow key={item.id} item={item} small={isSmall} />
        ))}
      </div>
    </div>
  );
}
