import { useState } from 'react';
import { useWidgetData } from '../../hooks/useWidgetData';
import { timeAgo } from '../../lib/time';
import { itemsForHeight } from '../../lib/widget-size';
import { ExternalLink } from 'lucide-react';
import type { WidgetDimensions } from '../../lib/widget-size';
import type { FeedResponse, FeedItem } from '../../types';

function stripHtml(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return doc.body.textContent || '';
}

function DigestItem({ item }: { item: FeedItem }) {
  const [expanded, setExpanded] = useState(false);
  const score = item.score != null ? Math.round(item.score * 10) / 10 : 0;
  const scorePercent = Math.min(100, Math.round((score / 10) * 100));
  const hasContent = !!(item.content || item.summary || item.url);

  return (
    <div className="relative rounded-md border-l-[3px] border-l-primary transition-colors hover:bg-accent/40 overflow-hidden">
      <div className="p-2 cursor-pointer" onClick={() => hasContent && setExpanded(!expanded)}>
        <div className="absolute top-0 left-0 h-full z-0"
          style={{ width: `${scorePercent}%`, background: 'linear-gradient(90deg, rgba(108,140,255,0.1), transparent)' }} />
        <div className="relative z-10">
          <div className="flex items-center gap-1.5 mb-0.5 text-[0.6rem]">
            <span className="font-bold text-primary">{score}</span>
            <span className="text-primary bg-primary/10 px-1 py-0.5 rounded font-medium">{item.source}</span>
            <span className="text-muted-foreground">{item.published_at ? timeAgo(item.published_at) : timeAgo(item.collected_at)}</span>
          </div>
          <h4 className="text-[0.8rem] font-medium leading-snug pl-2">{item.title}</h4>
        </div>
      </div>
      {expanded && (
        <div className="pl-5 pr-2 pb-2 border-t border-border/40 pt-1.5 space-y-1.5">
          {item.summary && <p className="text-[0.75rem] text-muted-foreground leading-relaxed italic">{item.summary}</p>}
          {item.content && (
            <div className="text-[0.75rem] text-foreground/80 leading-relaxed max-h-40 overflow-y-auto">
              {stripHtml(item.content).slice(0, 600)}{stripHtml(item.content).length > 600 && '...'}
            </div>
          )}
          {item.url && (
            <a href={item.url} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-primary hover:underline" onClick={(e) => e.stopPropagation()}>
              Open article <ExternalLink className="w-3 h-3" />
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
  const rh = dims?.rowHeightPx ?? 80;

  if (loading) return <div className="flex-1 flex items-center justify-center text-muted-foreground text-xs">Loading...</div>;
  if (error) return <div className="flex-1 flex items-center justify-center text-destructive text-xs">Error</div>;
  if (!data || data.items.length === 0) return <div className="flex-1 flex items-center justify-center text-muted-foreground text-xs">No digest yet</div>;

  if (size === 'small') {
    const max = itemsForHeight(h, rh, 24);
    return (
      <div className="flex flex-col overflow-hidden h-full">
        <div className="flex-1 overflow-y-auto">
          {data.items.slice(0, max).map((item) => (
            <div key={item.id} className="py-1 border-b border-border/30 last:border-0 truncate">
              <span className="text-[0.7rem] text-foreground cursor-pointer hover:text-primary" title={item.title}
                onClick={() => item.url && window.open(item.url, '_blank')}>{item.title}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const maxItems = Math.min(10, itemsForHeight(h, rh, 48));

  return (
    <div className="flex flex-col overflow-hidden h-full">
      <div className="flex-1 overflow-y-auto flex flex-col gap-1">
        {data.items.slice(0, maxItems).map((item) => <DigestItem key={item.id} item={item} />)}
      </div>
    </div>
  );
}
