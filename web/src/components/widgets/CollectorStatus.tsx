import { useWidgetData } from '../../hooks/useWidgetData';
import type { CollectorsResponse } from '../../types';

export default function CollectorStatus() {
  const { data, loading, error, refetch } = useWidgetData<CollectorsResponse>(
    '/api/collectors',
    30000
  );

  const triggerCollector = async (id: string) => {
    try {
      await fetch(`/api/collectors/${id}/run`, { method: 'POST' });
      // Refetch status after triggering
      setTimeout(refetch, 2000);
    } catch (err) {
      console.error('Failed to trigger collector:', err);
    }
  };

  if (loading) return <div className="widget-loading">Loading collectors...</div>;
  if (error) return <div className="widget-error">Error: {error}</div>;
  if (!data) return null;

  return (
    <div className="collector-status">
      <div className="widget-header">
        <h2>Collectors</h2>
      </div>
      <div className="collector-list">
        {data.collectors.map((collector) => {
          const lastRun = data.recent_runs.find(
            (r) => r.collector_id === collector.id
          );

          return (
            <div key={collector.id} className="collector-item">
              <div className="collector-info">
                <span className="collector-name">{collector.name}</span>
                <span className={`collector-badge ${collector.enabled ? 'enabled' : 'disabled'}`}>
                  {collector.enabled ? 'ON' : 'OFF'}
                </span>
              </div>
              {lastRun && (
                <div className="collector-run">
                  <span className={`run-status status-${lastRun.status}`}>
                    {lastRun.status}
                  </span>
                  <span className="run-items">{lastRun.items_count} items</span>
                </div>
              )}
              {collector.enabled && (
                <button
                  className="collector-trigger"
                  onClick={() => triggerCollector(collector.id)}
                >
                  Run Now
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
