import { useWidgetData } from '../../hooks/useWidgetData';
import { cn } from '../../lib/utils';
import { itemsForHeight } from '../../lib/widget-size';
import type { WidgetDimensions } from '../../lib/widget-size';
import type { FeedResponse, FeedItem } from '../../types';

interface StockMetadata {
  symbol: string;
  price: number;
  change: number;
  change_percent: number;
  direction: 'up' | 'down' | 'neutral';
}

function StockRow({ item, small }: { item: FeedItem; small?: boolean }) {
  const m = item.metadata as unknown as StockMetadata;
  const pos = m.direction === 'up';
  const neg = m.direction === 'down';
  const color = pos ? 'text-success' : neg ? 'text-destructive' : 'text-muted-foreground';

  return (
    <div className={cn('flex items-center justify-between', small ? 'py-0.5' : 'p-1.5 bg-muted rounded-md hover:bg-accent/40 transition-colors')}>
      <span className={cn('font-bold uppercase', small ? 'text-[0.65rem]' : 'text-xs')}>{m.symbol}</span>
      <div className="flex items-center gap-1.5">
        <span className={cn('font-semibold', color, small ? 'text-[0.65rem]' : 'text-xs')}>${m.price.toFixed(2)}</span>
        {!small && (
          <span className={cn('text-[0.6rem] font-medium px-1 py-0.5 rounded', pos && 'bg-success/10', neg && 'bg-destructive/10', color)}>
            {pos ? '+' : ''}{m.change_percent.toFixed(1)}%
          </span>
        )}
      </div>
    </div>
  );
}

interface Props { dims?: WidgetDimensions }

export default function StockTicker({ dims }: Props) {
  const { data, loading, error } = useWidgetData<FeedResponse>('/api/feed?source=stock&limit=20', 30000);
  const size = dims?.size ?? 'medium';
  const h = dims?.h ?? 3;
  const rh = dims?.rowHeightPx ?? 80;

  if (loading) return <div className="flex-1 flex items-center justify-center text-muted-foreground text-xs">Loading...</div>;
  if (error) return <div className="flex-1 flex items-center justify-center text-destructive text-xs">Error</div>;
  if (!data || data.items.length === 0) return <div className="flex-1 flex items-center justify-center text-muted-foreground text-xs">No stock data</div>;

  const isSmall = size === 'small';
  const perItemPx = isSmall ? 20 : 36;
  const maxItems = Math.min(20, itemsForHeight(h, rh, perItemPx));

  return (
    <div className="flex flex-col overflow-hidden h-full">
      <div className="flex-1 overflow-y-auto flex flex-col gap-0.5">
        {data.items.slice(0, maxItems).map((item) => <StockRow key={item.id} item={item} small={isSmall} />)}
      </div>
    </div>
  );
}
