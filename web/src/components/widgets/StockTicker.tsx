import { useWidgetData } from '../../hooks/useWidgetData';
import type { FeedResponse, FeedItem } from '../../types';

interface StockMetadata {
  symbol: string;
  price: number;
  change: number;
  change_percent: number;
  direction: 'up' | 'down' | 'neutral';
}

function StockItem({ item }: { item: FeedItem }) {
  const metadata = item.metadata as unknown as StockMetadata;
  const isPositive = metadata.direction === 'up';
  const isNegative = metadata.direction === 'down';

  const colorClass = isPositive ? 'positive' : isNegative ? 'negative' : 'neutral';

  return (
    <div className="stock-item">
      <div className="stock-symbol-price">
        <span className="stock-symbol">{metadata.symbol}</span>
        <span className={`stock-price ${colorClass}`}>
          ${metadata.price.toFixed(2)}
        </span>
      </div>
      <div className="stock-change">
        <span className={`stock-change-value ${colorClass}`}>
          {isPositive ? '+' : ''}{metadata.change.toFixed(2)}
        </span>
        <span className={`stock-change-percent ${colorClass}`}>
          {isPositive ? '+' : ''}{metadata.change_percent.toFixed(2)}%
        </span>
      </div>
    </div>
  );
}

export default function StockTicker() {
  const { data, loading, error } = useWidgetData<FeedResponse>(
    '/api/feed?source=stock&limit=20',
    30000
  );

  if (loading) return <div className="widget-loading">Loading stocks...</div>;
  if (error) return <div className="widget-error">Error: {error}</div>;
  if (!data || data.items.length === 0) {
    return (
      <div className="widget-empty">
        <p>No stock data available</p>
      </div>
    );
  }

  return (
    <div className="stock-ticker">
      <div className="widget-header">
        <h2>Stocks</h2>
        <span className="widget-count">{data.items.length}</span>
      </div>
      <div className="stock-list">
        {data.items.map((item) => (
          <StockItem key={item.id} item={item} />
        ))}
      </div>
    </div>
  );
}
