import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import GridLayout, { Layout } from 'react-grid-layout';
import { Settings as SettingsIcon, GripHorizontal } from 'lucide-react';
import NewsFeed from './widgets/NewsFeed';
import CollectorStatus from './widgets/CollectorStatus';
import StockTicker from './widgets/StockTicker';
import Weather from './widgets/Weather';
import Digest from './widgets/Digest';
import Trending from './widgets/Trending';
import { useWebSocket } from '../hooks/useWebSocket';
import { useContainerWidth } from '../hooks/useContainerWidth';
import { getWidgetSize } from '../lib/widget-size';
import type { FeedResponse } from '../types';

const COLS = 6;
const GAP = 10;
const PADDING = 16;

const defaultLayout: Layout[] = [
  { i: 'feed',       x: 0, y: 0, w: 3, h: 4, minW: 2, minH: 2 },
  { i: 'digest',     x: 3, y: 0, w: 3, h: 3, minW: 2, minH: 2 },
  { i: 'weather',    x: 0, y: 4, w: 2, h: 2, minW: 2, minH: 2 },
  { i: 'stocks',     x: 2, y: 4, w: 2, h: 2, minW: 2, minH: 2 },
  { i: 'trending',   x: 3, y: 3, w: 3, h: 2, minW: 2, minH: 2 },
  { i: 'collectors', x: 4, y: 4, w: 2, h: 2, minW: 2, minH: 2 },
];

function loadLayout(): Layout[] {
  try {
    const stored = localStorage.getItem('dashboard-layout-v3');
    if (stored) return JSON.parse(stored);
  } catch { /* ignore */ }
  return defaultLayout;
}

function WidgetShell({ children, title }: { children: React.ReactNode; title: string }) {
  return (
    <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden flex flex-col h-full">
      {/* Drag handle — only this area triggers drag */}
      <div className="widget-drag-handle flex items-center gap-1.5 px-3 py-1.5 border-b border-border/50 cursor-grab active:cursor-grabbing shrink-0 select-none">
        <GripHorizontal className="w-3.5 h-3.5 text-muted-foreground/50" />
        <span className="text-[0.65rem] font-semibold text-muted-foreground uppercase tracking-wider">{title}</span>
      </div>
      {/* Content area — clicks work here */}
      <div className="p-2.5 flex flex-col flex-1 overflow-hidden">
        {children}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [layout, setLayout] = useState<Layout[]>(loadLayout);
  const [refetchSignal, setRefetchSignal] = useState(0);
  const { ref: containerRef, width: containerWidth } = useContainerWidth();

  useWebSocket(
    (data) => {
      const msg = data as { type: string; payload?: FeedResponse };
      if (msg.type === 'new_items') {
        setRefetchSignal((prev) => prev + 1);
      }
    },
    () => console.log('WebSocket connected'),
    () => console.log('WebSocket disconnected')
  );

  const rowHeight = useMemo(() => {
    if (containerWidth === 0) return 100;
    const totalGaps = GAP * (COLS - 1);
    const totalPadding = PADDING * 2;
    return (containerWidth - totalGaps - totalPadding) / COLS;
  }, [containerWidth]);

  const handleLayoutChange = (newLayout: Layout[]) => {
    setLayout(newLayout);
    localStorage.setItem('dashboard-layout-v3', JSON.stringify(newLayout));
  };

  const widgetDims = useMemo(() => {
    const map: Record<string, { w: number; h: number; size: ReturnType<typeof getWidgetSize>; rowHeightPx: number }> = {};
    for (const item of layout) {
      map[item.i] = { w: item.w, h: item.h, size: getWidgetSize(item.w, item.h), rowHeightPx: rowHeight };
    }
    return map;
  }, [layout, rowHeight]);

  return (
    <div className="min-h-screen bg-background">
      <header className="flex items-center justify-between px-6 py-3 bg-card border-b border-border">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold tracking-tight text-foreground">Pulse</h1>
          <span className="text-xs text-muted-foreground hidden sm:inline">Personal Intelligence Dashboard</span>
        </div>
        <Link
          to="/settings"
          className="flex items-center gap-2 px-3 py-1.5 text-sm text-muted-foreground rounded-md hover:bg-accent hover:text-foreground transition-colors no-underline"
        >
          <SettingsIcon className="w-4 h-4" />
          <span className="hidden sm:inline">Settings</span>
        </Link>
      </header>

      <main ref={containerRef} className="p-4">
        {containerWidth > 0 && (
          <GridLayout
            className="w-full"
            layout={layout}
            onLayoutChange={handleLayoutChange}
            cols={COLS}
            rowHeight={rowHeight}
            width={containerWidth - PADDING * 2}
            draggableHandle=".widget-drag-handle"
            isDraggable={true}
            isResizable={true}
            compactType="vertical"
            preventCollision={false}
            containerPadding={[0, 0]}
            resizeHandles={['se', 'sw', 'ne', 'nw']}
            margin={[GAP, GAP]}
          >
            <div key="feed">
              <WidgetShell title="Feed">
                <NewsFeed key={`feed-${refetchSignal}`} dims={widgetDims['feed']} />
              </WidgetShell>
            </div>
            <div key="digest">
              <WidgetShell title="Digest">
                <Digest key={`digest-${refetchSignal}`} dims={widgetDims['digest']} />
              </WidgetShell>
            </div>
            <div key="weather">
              <WidgetShell title="Weather">
                <Weather key={`weather-${refetchSignal}`} dims={widgetDims['weather']} />
              </WidgetShell>
            </div>
            <div key="stocks">
              <WidgetShell title="Stocks">
                <StockTicker key={`stocks-${refetchSignal}`} dims={widgetDims['stocks']} />
              </WidgetShell>
            </div>
            <div key="trending">
              <WidgetShell title="Trending">
                <Trending key={`trending-${refetchSignal}`} dims={widgetDims['trending']} />
              </WidgetShell>
            </div>
            <div key="collectors">
              <WidgetShell title="Collectors">
                <CollectorStatus key={`collectors-${refetchSignal}`} dims={widgetDims['collectors']} />
              </WidgetShell>
            </div>
          </GridLayout>
        )}
      </main>
    </div>
  );
}
