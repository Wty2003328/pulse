import { useWidgetData } from '../../hooks/useWidgetData';
import { Badge } from '../ui/badge';
import { cn } from '../../lib/utils';
import type { WidgetDimensions } from '../../lib/widget-size';
import type { FeedResponse, FeedItem } from '../../types';

interface StockMetadata {
  symbol: string;
  price: number;
  change: number;
  change_percent: number;
  direction: 'up' | 'down' | 'neutral';
}

function StockItemRow({ item, compact }: { item: FeedItem; compact?: boolean }) {
  const m = item.metadata as unknown as StockMetadata;
  const pos = m.direction === 'up';
  const neg = m.direction === 'down';

  if (compact) {
    return (
      <div className="flex items-center justify-between py-0.5">
        <span className="text-[0.7rem] font-bold uppercase">{m.symbol}</span>
        <span className={cn('text-[0.7rem] font-semibold', pos && 'text-success', neg && 'text-destructive', !pos && !neg && 'text-muted-foreground')}>
          ${m.price.toFixed(2)}
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between p-2 bg-muted rounded-md transition-colors hover:bg-accent/50">
      <div className="flex items-baseline gap-2 flex-1">
        <span className="text-xs font-bold uppercase text-foreground min-w-[40px]">{m.symbol}</span>
        <span className={cn('text-xs font-semibold', pos && 'text-success', neg && 'text-destructive', !pos && !neg && 'text-muted-foreground')}>
          ${m.price.toFixed(2)}
        </span>
      </div>
      <div className="flex items-center gap-1 text-[0.65rem] font-medium">
        <span className={cn('px-1 py-0.5 rounded', pos && 'text-success bg-success/10', neg && 'text-destructive bg-destructive/10', !pos && !neg && 'text-muted-foreground bg-muted')}>
          {pos ? '+' : ''}{m.change_percent.toFixed(1)}%
        </span>
      </div>
    </div>
  );
}

interface Props { dims?: WidgetDimensions }

export default function StockTicker({ dims }: Props) {
  const { data, loading, error } = useWidgetData<FeedResponse>('/api/feed?source=stock&limit=20', 30000);
  const size = dims?.size ?? 'medium';

  if (loading) return <div className="flex-1 flex items-center justify-center text-muted-foreground text-xs">Loading stocks...</div>;
  if (error) return <div className="flex-1 flex items-center justify-center text-destructive text-xs">Error: {error}</div>;
  if (!data || data.items.length === 0) {
    return <div className="flex-1 flex items-center justify-center text-muted-foreground text-xs">No stock data</div>;
  }

  if (size === 'compact') {
    return (
      <div className="flex flex-col h-full overflow-hidden">
        <h2 className="text-[0.65rem] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Stocks</h2>
        {data.items.slice(0, 3).map((item) => <StockItemRow key={item.id} item={item} compact />)}
      </div>
    );
  }

  const maxItems = size === 'small' ? 5 : size === 'medium' ? 8 : 20;
  const useCompact = size === 'small';

  return (
    <div className="flex flex-col overflow-hidden h-full">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Stocks</h2>
        <Badge variant="secondary" className="text-[0.6rem] px-1.5 py-0">{data.items.length}</Badge>
      </div>
      <div className="flex-1 overflow-y-auto flex flex-col gap-1">
        {data.items.slice(0, maxItems).map((item) => (
          <StockItemRow key={item.id} item={item} compact={useCompact} />
        ))}
      </div>
    </div>
  );
}
