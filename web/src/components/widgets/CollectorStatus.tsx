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
  const h = dims?.h ?? 2;
  const rh = dims?.rowHeightPx ?? 100;

  const triggerCollector = async (id: string) => {
    try {
      await fetch(`/api/collectors/${id}/run`, { method: 'POST' });
      setTimeout(refetch, 2000);
    } catch (err) {
      console.error('Failed to trigger collector:', err);
    }
  };

  if (loading) return <div className="flex-1 flex items-center justify-center text-muted-foreground text-xs">Loading collectors...</div>;
  if (error) return <div className="flex-1 flex items-center justify-center text-destructive text-xs">Error: {error}</div>;
  if (!data) return null;

  // Compact: colored dots + names
  if (size === 'compact') {
    const maxItems = itemsForHeight(h, rh, 20);
    return (
      <div className="flex flex-col h-full overflow-hidden">
        <h2 className="text-[0.65rem] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Collectors</h2>
        <div className="flex flex-col gap-1">
          {data.collectors.slice(0, maxItems).map((c) => (
            <div key={c.id} className="flex items-center gap-1.5">
              <div className={`w-1.5 h-1.5 rounded-full ${c.enabled ? 'bg-success' : 'bg-muted-foreground'}`} />
              <span className="text-[0.65rem] text-foreground truncate">{c.name}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const showButtons = size === 'large' || size === 'medium';
  const perItemPx = showButtons ? 72 : 36;
  const maxItems = itemsForHeight(h, rh, perItemPx);

  return (
    <div className="flex flex-col overflow-hidden h-full">
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Collectors</h2>
      </div>
      <div className="flex-1 overflow-y-auto flex flex-col gap-2">
        {data.collectors.slice(0, maxItems).map((collector) => {
          const lastRun = data.recent_runs.find((r) => r.collector_id === collector.id);
          return (
            <div key={collector.id} className="p-2 bg-muted rounded-lg">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium">{collector.name}</span>
                <Badge variant={collector.enabled ? 'success' : 'secondary'} className="text-[0.55rem] px-1 py-0">
                  {collector.enabled ? 'ON' : 'OFF'}
                </Badge>
              </div>
              {lastRun && (
                <div className="flex items-center gap-1.5 mb-1">
                  <Badge variant={lastRun.status === 'success' ? 'success' : lastRun.status === 'running' ? 'warning' : 'destructive'} className="text-[0.55rem] px-1 py-0">{lastRun.status}</Badge>
                  <span className="text-[0.6rem] text-muted-foreground">{lastRun.items_count} items</span>
                </div>
              )}
              {collector.enabled && showButtons && (
                <Button variant="outline" size="sm" className="w-full h-6 text-[0.65rem]" onClick={() => triggerCollector(collector.id)}>Run Now</Button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
