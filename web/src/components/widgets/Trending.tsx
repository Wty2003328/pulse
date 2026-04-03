import { useMemo } from 'react';
import { useWidgetData } from '../../hooks/useWidgetData';
import type { FeedResponse } from '../../types';

interface TagCount {
  tag: string;
  count: number;
}

function TrendingTag({ tag, count, maxCount }: { tag: string; count: number; maxCount: number }) {
  const intensity = Math.min(100, (count / maxCount) * 100);
  const scale = 0.8 + (intensity / 100) * 0.4;

  return (
    <div
      className="trending-tag"
      style={{
        fontSize: `${scale}rem`,
        opacity: 0.6 + (intensity / 100) * 0.4,
      }}
      title={`${count} items`}
    >
      {tag}
      <span className="trending-tag-count">{count}</span>
    </div>
  );
}

export default function Trending() {
  const { data, loading, error } = useWidgetData<FeedResponse>(
    '/api/feed?limit=100',
    60000
  );

  const trendingTags = useMemo(() => {
    if (!data || !data.items) return [];

    const tagMap = new Map<string, number>();

    data.items.forEach((item) => {
      item.tags.forEach((tag) => {
        tagMap.set(tag, (tagMap.get(tag) || 0) + 1);
      });
    });

    return Array.from(tagMap.entries())
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 30);
  }, [data]);

  if (loading) return <div className="widget-loading">Loading trends...</div>;
  if (error) return <div className="widget-error">Error: {error}</div>;
  if (trendingTags.length === 0) {
    return (
      <div className="widget-empty">
        <p>No trending tags yet</p>
      </div>
    );
  }

  const maxCount = Math.max(...trendingTags.map((t) => t.count));

  return (
    <div className="trending">
      <div className="widget-header">
        <h2>Trending</h2>
        <span className="widget-count">{trendingTags.length}</span>
      </div>
      <div className="trending-cloud">
        {trendingTags.map((item) => (
          <TrendingTag
            key={item.tag}
            tag={item.tag}
            count={item.count}
            maxCount={maxCount}
          />
        ))}
      </div>
    </div>
  );
}
