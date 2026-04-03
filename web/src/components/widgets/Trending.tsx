import { useMemo } from 'react';
import { useWidgetData } from '../../hooks/useWidgetData';
import { Badge } from '../ui/badge';
import type { WidgetDimensions } from '../../lib/widget-size';
import type { FeedResponse } from '../../types';

function TrendingTag({ tag, count, maxCount, small }: { tag: string; count: number; maxCount: number; small?: boolean }) {
  const intensity = Math.min(100, (count / maxCount) * 100);

  if (small) {
    return (
      <span
        className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-primary/8 border border-primary/20 rounded text-primary text-[0.65rem] font-medium"
        style={{ opacity: 0.6 + (intensity / 100) * 0.4 }}
      >
        {tag}
      </span>
    );
  }

  const scale = 0.75 + (intensity / 100) * 0.35;
  return (
    <div
      className="inline-flex items-center gap-1 px-2 py-1 bg-primary/8 border border-primary/20 rounded-md text-primary font-medium transition-all hover:bg-primary/15 hover:border-primary hover:scale-105 cursor-default"
      style={{ fontSize: `${scale}rem`, opacity: 0.6 + (intensity / 100) * 0.4 }}
      title={`${count} items`}
    >
      {tag}
      <span className="text-[0.55rem] text-muted-foreground bg-muted px-0.5 py-0 rounded">{count}</span>
    </div>
  );
}

interface Props { dims?: WidgetDimensions }

export default function Trending({ dims }: Props) {
  const { data, loading, error } = useWidgetData<FeedResponse>('/api/feed?limit=100', 60000);
  const size = dims?.size ?? 'medium';

  const trendingTags = useMemo(() => {
    if (!data || !data.items) return [];
    const tagMap = new Map<string, number>();
    data.items.forEach((item) => {
      item.tags.forEach((tag) => tagMap.set(tag, (tagMap.get(tag) || 0) + 1));
    });
    return Array.from(tagMap.entries())
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 30);
  }, [data]);

  if (loading) return <div className="flex-1 flex items-center justify-center text-muted-foreground text-xs">Loading trends...</div>;
  if (error) return <div className="flex-1 flex items-center justify-center text-destructive text-xs">Error: {error}</div>;
  if (trendingTags.length === 0) {
    return <div className="flex-1 flex items-center justify-center text-muted-foreground text-xs">No trending tags yet</div>;
  }

  const maxCount = Math.max(...trendingTags.map((t) => t.count));
  const maxTags = size === 'compact' ? 5 : size === 'small' ? 10 : size === 'medium' ? 20 : 30;
  const useSmall = size === 'compact' || size === 'small';

  return (
    <div className="flex flex-col overflow-hidden h-full">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Trending</h2>
        {size !== 'compact' && <Badge variant="secondary" className="text-[0.6rem] px-1.5 py-0">{trendingTags.length}</Badge>}
      </div>
      <div className="flex-1 overflow-y-auto flex flex-wrap gap-1.5 content-start">
        {trendingTags.slice(0, maxTags).map((item) => (
          <TrendingTag key={item.tag} tag={item.tag} count={item.count} maxCount={maxCount} small={useSmall} />
        ))}
      </div>
    </div>
  );
}
