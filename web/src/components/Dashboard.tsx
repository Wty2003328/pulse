import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import GridLayout, { Layout } from 'react-grid-layout';
import { Settings as SettingsIcon } from 'lucide-react';
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
  { i: 'feed',       x: 0, y: 0, w: 3, h: 4, minW: 1, minH: 1 },
  { i: 'digest',     x: 3, y: 0, w: 3, h: 3, minW: 1, minH: 1 },
  { i: 'weather',    x: 0, y: 4, w: 2, h: 2, minW: 1, minH: 1 },
  { i: 'stocks',     x: 2, y: 4, w: 2, h: 2, minW: 1, minH: 1 },
  { i: 'trending',   x: 3, y: 3, w: 3, h: 2, minW: 1, minH: 1 },
  { i: 'collectors', x: 4, y: 4, w: 2, h: 2, minW: 1, minH: 1 },
];

function loadLayout(): Layout[] {
  try {
    const stored = localStorage.getItem('dashboard-layout-v2');
    if (stored) return JSON.parse(stored);
  } catch { /* ignore */ }
  return defaultLayout;
}

function WidgetShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden flex flex-col h-full">
      <div className="p-3 flex flex-col h-full overflow-hidden">
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

  // Compute square row height based on container width
  const rowHeight = useMemo(() => {
    if (containerWidth === 0) return 100;
    const totalGaps = GAP * (COLS - 1);
    const totalPadding = PADDING * 2;
    return (containerWidth - totalGaps - totalPadding) / COLS;
  }, [containerWidth]);

  const handleLayoutChange = (newLayout: Layout[]) => {
    setLayout(newLayout);
    localStorage.setItem('dashboard-layout-v2', JSON.stringify(newLayout));
  };

  // Build a map of widget id -> {w, h, size}
  const widgetDims = useMemo(() => {
    const map: Record<string, { w: number; h: number; size: ReturnType<typeof getWidgetSize> }> = {};
    for (const item of layout) {
      map[item.i] = { w: item.w, h: item.h, size: getWidgetSize(item.w, item.h) };
    }
    return map;
  }, [layout]);

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
            isDraggable={true}
            isResizable={true}
            compactType="vertical"
            preventCollision={false}
            containerPadding={[0, 0]}
            resizeHandles={['se', 'sw', 'ne', 'nw']}
            margin={[GAP, GAP]}
          >
            <div key="feed">
              <WidgetShell>
                <NewsFeed key={`feed-${refetchSignal}`} dims={widgetDims['feed']} />
              </WidgetShell>
            </div>
            <div key="digest">
              <WidgetShell>
                <Digest key={`digest-${refetchSignal}`} dims={widgetDims['digest']} />
              </WidgetShell>
            </div>
            <div key="weather">
              <WidgetShell>
                <Weather key={`weather-${refetchSignal}`} dims={widgetDims['weather']} />
              </WidgetShell>
            </div>
            <div key="stocks">
              <WidgetShell>
                <StockTicker key={`stocks-${refetchSignal}`} dims={widgetDims['stocks']} />
              </WidgetShell>
            </div>
            <div key="trending">
              <WidgetShell>
                <Trending key={`trending-${refetchSignal}`} dims={widgetDims['trending']} />
              </WidgetShell>
            </div>
            <div key="collectors">
              <WidgetShell>
                <CollectorStatus key={`collectors-${refetchSignal}`} dims={widgetDims['collectors']} />
              </WidgetShell>
            </div>
          </GridLayout>
        )}
      </main>
    </div>
  );
}
