import { useState } from 'react';
import { useWidgetData } from '../../hooks/useWidgetData';
import { cn } from '../../lib/utils';
import { itemsForHeight } from '../../lib/widget-size';
import { ChevronDown, ChevronUp, ExternalLink, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type { WidgetDimensions } from '../../lib/widget-size';
import type { FeedResponse, FeedItem } from '../../types';

interface StockMetadata {
  symbol: string; name: string; price: number; change: number; change_percent: number; direction: string;
  volume?: number; previous_close?: number; open?: number; day_high?: number; day_low?: number;
  '52w_high'?: number; '52w_low'?: number; market_cap?: number; currency?: string;
}

function fmt(n: number | undefined): string {
  if (n == null) return '-';
  if (n >= 1e12) return `${(n / 1e12).toFixed(1)}T`;
  if (n >= 1e9) return `${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return n.toFixed(2);
}

/* ── Small: compact ticker strip ── */
function SmallStockRow({ item }: { item: FeedItem }) {
  const m = item.metadata as unknown as StockMetadata;
  const pos = m.direction === 'up'; const neg = m.direction === 'down';
  const color = pos ? 'text-success' : neg ? 'text-destructive' : 'text-muted-foreground';
  return (
    <div className="flex items-center justify-between py-0.5 gap-1">
      <div className="flex items-center gap-1 min-w-0">
        {pos ? <TrendingUp className="w-2.5 h-2.5 text-success shrink-0" /> : neg ? <TrendingDown className="w-2.5 h-2.5 text-destructive shrink-0" /> : <Minus className="w-2.5 h-2.5 text-muted-foreground shrink-0" />}
        <span className="text-[0.65rem] font-bold uppercase">{m.symbol}</span>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <span className={cn('text-[0.65rem] font-semibold', color)}>${m.price.toFixed(2)}</span>
        <span className={cn('text-[0.55rem] font-medium', color)}>{pos ? '+' : ''}{m.change_percent.toFixed(1)}%</span>
      </div>
    </div>
  );
}

/* ── Medium: price + volume + day range bar ── */
function MediumStockRow({ item }: { item: FeedItem }) {
  const [expanded, setExpanded] = useState(false);
  const m = item.metadata as unknown as StockMetadata;
  const pos = m.direction === 'up'; const neg = m.direction === 'down';
  const color = pos ? 'text-success' : neg ? 'text-destructive' : 'text-muted-foreground';
  const bgColor = pos ? 'bg-success/8' : neg ? 'bg-destructive/8' : 'bg-muted';

  // Day range bar position (where current price sits between low and high)
  const dayLow = m.day_low ?? m.price;
  const dayHigh = m.day_high ?? m.price;
  const range = dayHigh - dayLow;
  const pctInRange = range > 0 ? ((m.price - dayLow) / range) * 100 : 50;

  return (
    <div className={cn('rounded-md transition-colors', bgColor)}>
      <div className="flex items-center gap-2 px-2 py-1 cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <div className="flex items-center gap-1 min-w-0 w-16 shrink-0">
          {pos ? <TrendingUp className="w-3 h-3 text-success shrink-0" /> : neg ? <TrendingDown className="w-3 h-3 text-destructive shrink-0" /> : <Minus className="w-3 h-3 text-muted-foreground shrink-0" />}
          <span className="text-[0.7rem] font-bold uppercase">{m.symbol}</span>
        </div>
        <span className={cn('text-[0.7rem] font-semibold w-16 text-right shrink-0', color)}>${m.price.toFixed(2)}</span>
        <span className={cn('text-[0.6rem] font-medium w-12 text-right shrink-0', color)}>{pos ? '+' : ''}{m.change_percent.toFixed(2)}%</span>
        {/* Day range micro bar */}
        <div className="flex-1 min-w-8 h-1 bg-border/60 rounded-full overflow-hidden relative mx-1 hidden sm:block">
          <div className="absolute top-0 h-full w-1 bg-foreground/60 rounded-full" style={{ left: `${pctInRange}%`, transform: 'translateX(-50%)' }} />
        </div>
        <span className="text-[0.55rem] text-muted-foreground w-10 text-right shrink-0 hidden sm:block">{fmt(m.volume)}</span>
        {expanded ? <ChevronUp className="w-3 h-3 text-muted-foreground shrink-0" /> : <ChevronDown className="w-3 h-3 text-muted-foreground shrink-0" />}
      </div>
      {expanded && (
        <div className="px-2 pb-1.5 border-t border-border/30 pt-1">
          <div className="grid grid-cols-3 gap-x-3 gap-y-0.5 text-[0.55rem]">
            <div className="flex justify-between"><span className="text-muted-foreground">Open</span><span className="font-medium">${m.open?.toFixed(2) ?? '-'}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Prev</span><span className="font-medium">${m.previous_close?.toFixed(2) ?? '-'}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Vol</span><span className="font-medium">{fmt(m.volume)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">High</span><span className="font-medium text-destructive/70">${m.day_high?.toFixed(2) ?? '-'}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Low</span><span className="font-medium text-blue-400/70">${m.day_low?.toFixed(2) ?? '-'}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Cap</span><span className="font-medium">{fmt(m.market_cap)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">52W H</span><span className="font-medium">${m['52w_high']?.toFixed(2) ?? '-'}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">52W L</span><span className="font-medium">${m['52w_low']?.toFixed(2) ?? '-'}</span></div>
            <div className="flex justify-between">
              {item.url && <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center gap-0.5" onClick={(e) => e.stopPropagation()}>Yahoo <ExternalLink className="w-2 h-2" /></a>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface Props { dims?: WidgetDimensions }

export default function StockTicker({ dims }: Props) {
  const { data, loading, error } = useWidgetData<FeedResponse>('/api/feed?source=stock&limit=20', 60000);
  const size = dims?.size ?? 'medium';
  const h = dims?.h ?? 3;
  const rh = dims?.rowHeightPx ?? 80;

  if (loading) return <div className="flex-1 flex items-center justify-center text-muted-foreground text-xs">Loading...</div>;
  if (error) return <div className="flex-1 flex items-center justify-center text-destructive text-xs">Error</div>;
  if (!data || data.items.length === 0) return <div className="flex-1 flex items-center justify-center text-muted-foreground text-xs">No stock data</div>;

  if (size === 'small') {
    const max = itemsForHeight(h, rh, 18);
    return (
      <div className="flex flex-col overflow-hidden h-full">
        <div className="flex-1 overflow-y-auto">{data.items.slice(0, max).map((i) => <SmallStockRow key={i.id} item={i} />)}</div>
      </div>
    );
  }

  const max = itemsForHeight(h, rh, 28);
  return (
    <div className="flex flex-col overflow-hidden h-full">
      <div className="flex-1 overflow-y-auto flex flex-col gap-0.5">{data.items.slice(0, max).map((i) => <MediumStockRow key={i.id} item={i} />)}</div>
    </div>
  );
}
