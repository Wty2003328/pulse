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

function FeedItemRow({ item }: { item: FeedItem }) {
  const [expanded, setExpanded] = useState(false);
  const score = item.score != null ? Math.round(item.score * 10) / 10 : null;
  const hasContent = !!(item.content || item.summary);

  return (
    <div className="rounded-lg transition-colors hover:bg-accent/50">
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
          {score !== null && (
            <span className="text-[0.55rem] font-bold text-success bg-success/10 px-1.5 py-0.5 rounded ml-auto">{score}</span>
          )}
          {hasContent && (
            expanded
              ? <ChevronUp className="w-3 h-3 text-muted-foreground shrink-0" />
              : <ChevronDown className="w-3 h-3 text-muted-foreground shrink-0" />
          )}
        </div>
        <h3 className="text-[0.85rem] font-medium leading-snug">
          {item.title}
        </h3>
        {item.tags.length > 0 && (
          <div className="flex gap-1 flex-wrap mt-1">
            {item.tags.slice(0, 4).map((tag) => (
              <span key={tag} className="text-[0.55rem] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{tag}</span>
            ))}
          </div>
        )}
      </div>

      {/* Expanded content */}
      {expanded && (
        <div className="px-3 pb-3 border-t border-border mt-1 pt-2">
          {item.summary && (
            <p className="text-xs text-muted-foreground leading-relaxed mb-2 italic">{item.summary}</p>
          )}
          {item.content && (
            <div className="text-xs text-foreground/80 leading-relaxed max-h-48 overflow-y-auto mb-2">
              {stripHtml(item.content).slice(0, 800)}
              {stripHtml(item.content).length > 800 && '...'}
            </div>
          )}
          {item.url && (
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
              onClick={(e) => e.stopPropagation()}
            >
              Read full article <ExternalLink className="w-3 h-3" />
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

  // Use height to determine how many items fit
  const perItemPx = size === 'compact' ? 24 : size === 'small' ? 40 : 52;
  const maxItems = Math.min(50, itemsForHeight(h, rh, perItemPx));

  if (size === 'compact') {
    return (
      <div className="flex flex-col gap-1 overflow-hidden h-full">
        <h2 className="text-[0.65rem] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Feed</h2>
        {data.items.slice(0, maxItems).map((item) => (
          <a key={item.id} href={item.url ?? undefined} target="_blank" rel="noopener noreferrer"
            className="block text-xs leading-snug text-foreground hover:text-primary truncate no-underline">
            {item.title}
          </a>
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col overflow-hidden h-full">
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Feed</h2>
        <Badge variant="secondary" className="text-[0.6rem] px-1.5 py-0">{data.count}</Badge>
      </div>
      <div className="flex-1 overflow-y-auto flex flex-col">
        {data.items.slice(0, maxItems).map((item) => (
          <FeedItemRow key={item.id} item={item} />
        ))}
      </div>
    </div>
  );
}
