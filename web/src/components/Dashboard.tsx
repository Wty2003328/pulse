import { useState } from 'react';
import GridLayout, { Layout } from 'react-grid-layout';
import NewsFeed from './widgets/NewsFeed';
import CollectorStatus from './widgets/CollectorStatus';
import StockTicker from './widgets/StockTicker';
import Weather from './widgets/Weather';
import Digest from './widgets/Digest';
import Trending from './widgets/Trending';
import { useWebSocket } from '../hooks/useWebSocket';
import type { FeedResponse } from '../types';

const defaultLayout: Layout[] = [
  { i: 'feed', x: 0, y: 0, w: 6, h: 8, minW: 3, minH: 4 },
  { i: 'digest', x: 6, y: 0, w: 3, h: 5, minW: 3, minH: 3 },
  { i: 'weather', x: 9, y: 0, w: 3, h: 4, minW: 3, minH: 3 },
  { i: 'stocks', x: 9, y: 4, w: 3, h: 4, minW: 3, minH: 3 },
  { i: 'trending', x: 6, y: 5, w: 3, h: 4, minW: 3, minH: 3 },
  { i: 'collectors', x: 0, y: 8, w: 3, h: 4, minW: 3, minH: 3 },
];

export default function Dashboard() {
  const [layout, setLayout] = useState<Layout[]>(defaultLayout);
  const [refetchSignal, setRefetchSignal] = useState(0);

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

  const handleLayoutChange = (newLayout: Layout[]) => {
    setLayout(newLayout);
    localStorage.setItem('dashboard-layout', JSON.stringify(newLayout));
  };

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div className="header-brand">
          <h1>Pulse</h1>
          <span className="header-subtitle">Personal Intelligence Dashboard</span>
        </div>
      </header>
      <main className="dashboard-grid-container">
        <GridLayout
          className="dashboard-grid"
          layout={layout}
          onLayoutChange={handleLayoutChange}
          cols={12}
          rowHeight={60}
          width={1200}
          isDraggable={true}
          isResizable={true}
          compactType="vertical"
          preventCollision={false}
          containerPadding={[20, 20]}
          margin={[12, 12]}
        >
          <div key="feed" className="grid-item">
            <NewsFeed key={`feed-${refetchSignal}`} />
          </div>
          <div key="digest" className="grid-item">
            <Digest key={`digest-${refetchSignal}`} />
          </div>
          <div key="weather" className="grid-item">
            <Weather key={`weather-${refetchSignal}`} />
          </div>
          <div key="stocks" className="grid-item">
            <StockTicker key={`stocks-${refetchSignal}`} />
          </div>
          <div key="trending" className="grid-item">
            <Trending key={`trending-${refetchSignal}`} />
          </div>
          <div key="collectors" className="grid-item">
            <CollectorStatus key={`collectors-${refetchSignal}`} />
          </div>
        </GridLayout>
      </main>
    </div>
  );
}
