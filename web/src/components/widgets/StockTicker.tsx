import { useState } from 'react';
import { useWidgetData } from '../../hooks/useWidgetData';
import { cn } from '../../lib/utils';
import { itemsForHeight } from '../../lib/widget-size';
import { ChevronDown, ChevronUp, ExternalLink, TrendingUp, TrendingDown } from 'lucide-react';
import type { WidgetDimensions } from '../../lib/widget-size';
import type { FeedResponse, FeedItem } from '../../types';

interface StockMetadata {
  symbol: string;
  name: string;
  price: number;
  change: number;
  change_percent: number;
  direction: string;
  volume?: number;
  previous_close?: number;
  open?: number;
  day_high?: number;
  day_low?: number;
  '52w_high'?: number;
  '52w_low'?: number;
  market_cap?: number;
  currency?: string;
}

function formatNum(n: number | undefined): string {
  if (n == null) return '-';
  if (n >= 1e12) return `${(n / 1e12).toFixed(1)}T`;
  if (n >= 1e9) return `${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return n.toFixed(2);
}

function StockRow({ item, small }: { item: FeedItem; small?: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const m = item.metadata as unknown as StockMetadata;
  const pos = m.direction === 'up';
  const neg = m.direction === 'down';
  const color = pos ? 'text-success' : neg ? 'text-destructive' : 'text-muted-foreground';
  const Icon = pos ? TrendingUp : TrendingDown;

  if (small) {
    return (
      <div className="flex items-center justify-between py-0.5">
        <span className="text-[0.65rem] font-bold uppercase">{m.symbol}</span>
        <div className="flex items-center gap-1">
          <span className={cn('text-[0.65rem] font-semibold', color)}>${m.price.toFixed(2)}</span>
          <Icon className={cn('w-2.5 h-2.5', color)} />
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-md hover:bg-accent/40 transition-colors">
      <div className="flex items-center justify-between p-1.5 cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Icon className={cn('w-3.5 h-3.5 shrink-0', color)} />
          <div className="min-w-0">
            <span className="text-xs font-bold uppercase">{m.symbol}</span>
            <span className="text-[0.6rem] text-muted-foreground ml-1.5 hidden sm:inline">{m.name}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className={cn('text-xs font-semibold', color)}>${m.price.toFixed(2)}</span>
          <span className={cn('text-[0.6rem] font-medium px-1 py-0.5 rounded', pos && 'bg-success/10', neg && 'bg-destructive/10', color)}>
            {pos ? '+' : ''}{m.change_percent.toFixed(2)}%
          </span>
          {expanded ? <ChevronUp className="w-3 h-3 text-muted-foreground" /> : <ChevronDown className="w-3 h-3 text-muted-foreground" />}
        </div>
      </div>

      {expanded && (
        <div className="px-2 pb-2 border-t border-border/40 pt-1.5">
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[0.6rem]">
            <div className="flex justify-between"><span className="text-muted-foreground">Open</span><span className="font-medium">${m.open?.toFixed(2) ?? '-'}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Prev Close</span><span className="font-medium">${m.previous_close?.toFixed(2) ?? '-'}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Day High</span><span className="font-medium text-destructive/70">${m.day_high?.toFixed(2) ?? '-'}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Day Low</span><span className="font-medium text-blue-400/70">${m.day_low?.toFixed(2) ?? '-'}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">52W High</span><span className="font-medium">${m['52w_high']?.toFixed(2) ?? '-'}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">52W Low</span><span className="font-medium">${m['52w_low']?.toFixed(2) ?? '-'}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Volume</span><span className="font-medium">{formatNum(m.volume)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Mkt Cap</span><span className="font-medium">{formatNum(m.market_cap)}</span></div>
          </div>
          {item.url && (
            <a href={item.url} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[0.6rem] text-primary hover:underline mt-1.5" onClick={(e) => e.stopPropagation()}>
              Yahoo Finance <ExternalLink className="w-2.5 h-2.5" />
            </a>
          )}
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

  const isSmall = size === 'small';
  const perItemPx = isSmall ? 20 : 32;
  const maxItems = Math.min(20, itemsForHeight(h, rh, perItemPx));

  return (
    <div className="flex flex-col overflow-hidden h-full">
      <div className="flex-1 overflow-y-auto flex flex-col gap-0.5">
        {data.items.slice(0, maxItems).map((item) => <StockRow key={item.id} item={item} small={isSmall} />)}
      </div>
    </div>
  );
}
