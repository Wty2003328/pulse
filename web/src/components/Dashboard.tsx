import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import GridLayout, { Layout } from 'react-grid-layout';
import { Settings as SettingsIcon, GripHorizontal } from 'lucide-react';
import NewsFeed from './widgets/NewsFeed';
import CollectorStatus from './widgets/CollectorStatus';
import StockTicker from './widgets/StockTicker';
import Weather from './widgets/Weather';
import Digest from './widgets/Digest';
import Trending from './widgets/Trending';
import SystemMonitor from './widgets/SystemMonitor';
import Calendar from './widgets/Calendar';
import ZeroClawAgent from './widgets/ZeroClawAgent';
import { useWebSocket } from '../hooks/useWebSocket';
import { getWidgetSize } from '../lib/widget-size';
import type { FeedResponse } from '../types';

const COLS = 12;
const GAP = 8;
const HEADER_HEIGHT = 49; // header px height

const defaultLayout: Layout[] = [
  { i: 'feed',       x: 0,  y: 0, w: 5, h: 6, minW: 2, minH: 2 },
  { i: 'digest',     x: 5,  y: 0, w: 4, h: 4, minW: 2, minH: 2 },
  { i: 'weather',    x: 9,  y: 0, w: 3, h: 4, minW: 2, minH: 2 },
  { i: 'stocks',     x: 5,  y: 4, w: 4, h: 3, minW: 2, minH: 2 },
  { i: 'system',     x: 9,  y: 4, w: 3, h: 3, minW: 2, minH: 2 },
  { i: 'calendar',   x: 0,  y: 6, w: 3, h: 4, minW: 2, minH: 2 },
  { i: 'zeroclaw',   x: 3,  y: 6, w: 5, h: 4, minW: 2, minH: 2 },
  { i: 'trending',   x: 8,  y: 7, w: 4, h: 3, minW: 2, minH: 2 },
  { i: 'collectors', x: 0,  y: 10,w: 3, h: 3, minW: 2, minH: 2 },
];

function loadLayout(): Layout[] {
  try {
    const stored = localStorage.getItem('dashboard-layout-v6');
    if (stored) return JSON.parse(stored);
  } catch { /* ignore */ }
  return defaultLayout;
}

function WidgetShell({ children, title }: { children: React.ReactNode; title: string }) {
  return (
    <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden flex flex-col h-full">
      <div className="widget-drag-handle flex items-center gap-1.5 px-3 py-1 border-b border-border/50 cursor-grab active:cursor-grabbing shrink-0 select-none">
        <GripHorizontal className="w-3.5 h-3.5 text-muted-foreground/40" />
        <span className="text-[0.6rem] font-semibold text-muted-foreground uppercase tracking-wider">{title}</span>
      </div>
      <div className="p-2 flex flex-col flex-1 overflow-hidden">
        {children}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [layout, setLayout] = useState<Layout[]>(loadLayout);
  const [refetchSignal, setRefetchSignal] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [containerHeight, setContainerHeight] = useState(0);

  // Measure container on mount and resize
  const measure = useCallback(() => {
    if (containerRef.current) {
      setContainerWidth(containerRef.current.offsetWidth);
      setContainerHeight(window.innerHeight - HEADER_HEIGHT);
    }
  }, []);

  useEffect(() => {
    measure();
    window.addEventListener('resize', measure);
    const observer = new ResizeObserver(measure);
    if (containerRef.current) observer.observe(containerRef.current);
    return () => { window.removeEventListener('resize', measure); observer.disconnect(); };
  }, [measure]);

  useWebSocket(
    (data) => {
      const msg = data as { type: string; payload?: FeedResponse };
      if (msg.type === 'new_items') setRefetchSignal((prev) => prev + 1);
    },
    () => console.log('WebSocket connected'),
    () => console.log('WebSocket disconnected')
  );

  // Compute row height so the grid fits exactly in the viewport
  const rowHeight = useMemo(() => {
    if (containerWidth === 0 || containerHeight === 0) return 50;
    // Calculate how many rows the tallest layout column needs
    let maxRow = 0;
    for (const item of layout) {
      maxRow = Math.max(maxRow, item.y + item.h);
    }
    if (maxRow === 0) maxRow = 8;

    // row height from width (square cells)
    const cellFromWidth = (containerWidth - GAP * (COLS - 1)) / COLS;
    // row height that fits viewport
    const padding = 8; // top + bottom padding
    const cellFromHeight = (containerHeight - padding - GAP * (maxRow - 1)) / maxRow;

    // Use the smaller to ensure it fits in viewport
    return Math.floor(Math.min(cellFromWidth, cellFromHeight));
  }, [containerWidth, containerHeight, layout]);

  const handleLayoutChange = (newLayout: Layout[]) => {
    setLayout(newLayout);
    localStorage.setItem('dashboard-layout-v6', JSON.stringify(newLayout));
  };

  const widgetDims = useMemo(() => {
    const map: Record<string, { w: number; h: number; size: ReturnType<typeof getWidgetSize>; rowHeightPx: number }> = {};
    for (const item of layout) {
      map[item.i] = { w: item.w, h: item.h, size: getWidgetSize(item.w, item.h), rowHeightPx: rowHeight };
    }
    return map;
  }, [layout, rowHeight]);

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-background">
      <header className="flex items-center justify-between px-6 py-3 bg-card border-b border-border shrink-0">
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

      <main ref={containerRef} className="flex-1 p-1 overflow-hidden">
        {containerWidth > 0 && (
          <GridLayout
            className="w-full"
            layout={layout}
            onLayoutChange={handleLayoutChange}
            cols={COLS}
            rowHeight={rowHeight}
            width={containerWidth - 8}
            draggableHandle=".widget-drag-handle"
            isDraggable={true}
            isResizable={true}
            compactType="vertical"
            preventCollision={false}
            containerPadding={[4, 4]}
            resizeHandles={['se', 'sw', 'ne', 'nw']}
            margin={[GAP, GAP]}
          >
            <div key="feed"><WidgetShell title="Feed"><NewsFeed key={`f-${refetchSignal}`} dims={widgetDims['feed']} /></WidgetShell></div>
            <div key="digest"><WidgetShell title="Digest"><Digest key={`d-${refetchSignal}`} dims={widgetDims['digest']} /></WidgetShell></div>
            <div key="weather"><WidgetShell title="Weather"><Weather key={`w-${refetchSignal}`} dims={widgetDims['weather']} /></WidgetShell></div>
            <div key="stocks"><WidgetShell title="Stocks"><StockTicker key={`s-${refetchSignal}`} dims={widgetDims['stocks']} /></WidgetShell></div>
            <div key="trending"><WidgetShell title="Trending"><Trending key={`t-${refetchSignal}`} dims={widgetDims['trending']} /></WidgetShell></div>
            <div key="collectors"><WidgetShell title="Collectors"><CollectorStatus key={`c-${refetchSignal}`} dims={widgetDims['collectors']} /></WidgetShell></div>
            <div key="system"><WidgetShell title="System"><SystemMonitor dims={widgetDims['system']} /></WidgetShell></div>
            <div key="calendar"><WidgetShell title="Calendar"><Calendar dims={widgetDims['calendar']} /></WidgetShell></div>
            <div key="zeroclaw"><WidgetShell title="ZeroClaw"><ZeroClawAgent dims={widgetDims['zeroclaw']} /></WidgetShell></div>
          </GridLayout>
        )}
      </main>
    </div>
  );
}
