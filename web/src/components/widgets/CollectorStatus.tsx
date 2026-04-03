import { useWidgetData } from '../../hooks/useWidgetData';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { itemsForHeight } from '../../lib/widget-size';
import type { WidgetDimensions } from '../../lib/widget-size';
import type { CollectorsResponse } from '../../types';

interface Props { dims?: WidgetDimensions }

export default function CollectorStatus({ dims }: Props) {
  const { data, loading, error, refetch } = useWidgetData<CollectorsResponse>('/api/collectors', 30000);
  const size = dims?.size ?? 'medium';
  const h = dims?.h ?? 3;
  const rh = dims?.rowHeightPx ?? 80;

  const triggerCollector = async (id: string) => {
    try { await fetch(`/api/collectors/${id}/run`, { method: 'POST' }); setTimeout(refetch, 2000); }
    catch (err) { console.error('Failed to trigger collector:', err); }
  };

  if (loading) return <div className="flex-1 flex items-center justify-center text-muted-foreground text-xs">Loading...</div>;
  if (error) return <div className="flex-1 flex items-center justify-center text-destructive text-xs">Error</div>;
  if (!data) return null;

  // Small: status dots
  if (size === 'small') {
    return (
      <div className="flex flex-col h-full overflow-y-auto gap-1">
        {data.collectors.map((c) => (
          <div key={c.id} className="flex items-center gap-1.5 py-0.5">
            <div className={`w-2 h-2 rounded-full shrink-0 ${c.enabled ? 'bg-success' : 'bg-muted-foreground/40'}`} />
            <span className="text-[0.7rem] text-foreground truncate">{c.name}</span>
          </div>
        ))}
      </div>
    );
  }

  const perItemPx = 60;
  const maxItems = itemsForHeight(h, rh, perItemPx);

  return (
    <div className="flex flex-col overflow-hidden h-full">
      <div className="flex-1 overflow-y-auto flex flex-col gap-1.5">
        {data.collectors.slice(0, maxItems).map((collector) => {
          const lastRun = data.recent_runs.find((r) => r.collector_id === collector.id);
          return (
            <div key={collector.id} className="p-2 bg-muted rounded-lg">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium">{collector.name}</span>
                <Badge variant={collector.enabled ? 'success' : 'secondary'} className="text-[0.55rem] px-1 py-0">{collector.enabled ? 'ON' : 'OFF'}</Badge>
              </div>
              {lastRun && (
                <div className="flex items-center gap-1.5 mb-1">
                  <Badge variant={lastRun.status === 'success' ? 'success' : lastRun.status === 'running' ? 'warning' : 'destructive'} className="text-[0.55rem] px-1 py-0">{lastRun.status}</Badge>
                  <span className="text-[0.6rem] text-muted-foreground">{lastRun.items_count} items</span>
                </div>
              )}
              {collector.enabled && <Button variant="outline" size="sm" className="w-full h-5 text-[0.6rem]" onClick={() => triggerCollector(collector.id)}>Run Now</Button>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
