import { useState } from 'react';
import { useWidgetData } from '../../hooks/useWidgetData';
import { cn } from '../../lib/utils';
import { itemsForHeight } from '../../lib/widget-size';
import { ChevronDown, ChevronUp, ExternalLink, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type { WidgetDimensions } from '../../lib/widget-size';
import type { FeedResponse, FeedItem } from '../../types';

interface StockMeta {
  symbol: string; name: string; price: number; change: number; change_percent: number; direction: string;
  volume?: number; previous_close?: number; open?: number; day_high?: number; day_low?: number;
  '52w_high'?: number; '52w_low'?: number; market_cap?: number;
}

function fmt(n: number | undefined): string {
  if (n == null) return '-';
  if (n >= 1e12) return `${(n / 1e12).toFixed(1)}T`;
  if (n >= 1e9) return `${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return n.toFixed(2);
}

function DirIcon({ dir }: { dir: string }) {
  if (dir === 'up') return <TrendingUp className="w-3.5 h-3.5 text-success shrink-0" />;
  if (dir === 'down') return <TrendingDown className="w-3.5 h-3.5 text-destructive shrink-0" />;
  return <Minus className="w-3.5 h-3.5 text-muted-foreground shrink-0" />;
}

function StockRow({ item, expandable, forceExpanded }: { item: FeedItem; expandable?: boolean; forceExpanded?: boolean }) {
  const [manualExpanded, setManualExpanded] = useState(false);
  const expanded = forceExpanded || manualExpanded;
  const m = item.metadata as unknown as StockMeta;
  const pos = m.direction === 'up'; const neg = m.direction === 'down';
  const color = pos ? 'text-success' : neg ? 'text-destructive' : 'text-muted-foreground';
  const bg = pos ? 'bg-success/8' : neg ? 'bg-destructive/8' : 'bg-muted';

  return (
    <div className={cn('rounded-md', bg)}>
      <div className={cn('flex items-center gap-2 px-2.5 py-1.5', expandable && 'cursor-pointer')} onClick={() => expandable && setManualExpanded(!manualExpanded)}>
        <DirIcon dir={m.direction} />
        <span className="text-sm font-bold uppercase w-14 shrink-0">{m.symbol}</span>
        <span className={cn('text-sm font-semibold flex-1', color)}>${m.price.toFixed(2)}</span>
        <span className={cn('text-xs font-medium px-1.5 py-0.5 rounded', pos && 'bg-success/15', neg && 'bg-destructive/15', color)}>
          {pos ? '+' : ''}{m.change_percent.toFixed(2)}%
        </span>
        {expandable && (expanded ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />)}
      </div>
      {expanded && (
        <div className="px-2.5 pb-2 border-t border-border/30 pt-1.5">
          <div className="grid grid-cols-3 gap-x-4 gap-y-1 text-xs">
            <div className="flex justify-between"><span className="text-muted-foreground">Open</span><span className="font-medium">${m.open?.toFixed(2) ?? '-'}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Prev</span><span className="font-medium">${m.previous_close?.toFixed(2) ?? '-'}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Vol</span><span className="font-medium">{fmt(m.volume)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">High</span><span className="font-medium text-destructive/70">${m.day_high?.toFixed(2) ?? '-'}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Low</span><span className="font-medium text-blue-400/70">${m.day_low?.toFixed(2) ?? '-'}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Cap</span><span className="font-medium">{fmt(m.market_cap)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">52W H</span><span className="font-medium">${m['52w_high']?.toFixed(2) ?? '-'}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">52W L</span><span className="font-medium">${m['52w_low']?.toFixed(2) ?? '-'}</span></div>
            <div>{item.url && <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center gap-0.5" onClick={(e) => e.stopPropagation()}>Yahoo <ExternalLink className="w-2.5 h-2.5" /></a>}</div>
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
  const h = dims?.h ?? 3; const rh = dims?.rowHeightPx ?? 80;

  if (loading) return <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">Loading...</div>;
  if (error) return <div className="flex-1 flex items-center justify-center text-destructive text-sm">Error</div>;
  if (!data || data.items.length === 0) return <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">No stock data</div>;

  if (size === 'small') {
    const max = itemsForHeight(h, rh, 24);
    return (
      <div className="flex flex-col overflow-hidden h-full gap-0.5">
        {data.items.slice(0, max).map((i) => {
          const m = i.metadata as unknown as StockMeta;
          const color = m.direction === 'up' ? 'text-success' : m.direction === 'down' ? 'text-destructive' : 'text-muted-foreground';
          return (
            <div key={i.id} className="flex items-center justify-between py-0.5">
              <div className="flex items-center gap-1"><DirIcon dir={m.direction} /><span className="text-xs font-bold uppercase">{m.symbol}</span></div>
              <span className={cn('text-xs font-semibold', color)}>${m.price.toFixed(2)}</span>
            </div>
          );
        })}
      </div>
    );
  }

  // Large: auto-expand all rows
  const autoExpand = size === 'large';
  const max = itemsForHeight(h, rh, autoExpand ? 90 : 34);
  return (
    <div className="flex flex-col overflow-hidden h-full">
      <div className="flex-1 overflow-y-auto flex flex-col gap-1">{data.items.slice(0, max).map((i) => <StockRow key={i.id} item={i} expandable forceExpanded={autoExpand} />)}</div>
    </div>
  );
}
