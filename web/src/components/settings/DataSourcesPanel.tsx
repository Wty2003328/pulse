import { useWidgetData } from '../../hooks/useWidgetData';
import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import type { CollectorsResponse } from '../../types';

interface Props {
  onToast: (message: string, type: 'success' | 'error') => void;
}

export function DataSourcesPanel({ onToast }: Props) {
  const { data, loading, refetch } = useWidgetData<CollectorsResponse>('/api/collectors', 30000);

  const triggerCollector = async (id: string, name: string) => {
    try {
      await fetch(`/api/collectors/${id}/run`, { method: 'POST' });
      onToast(`${name} collector triggered`, 'success');
      setTimeout(refetch, 2000);
    } catch {
      onToast('Failed to trigger collector', 'error');
    }
  };

  return (
    <div>
      <h2 className="text-lg font-semibold mb-1">Data Sources</h2>
      <p className="text-sm text-muted-foreground mb-6">
        Active collectors that feed the dashboard. Configure sources in <code className="text-xs bg-muted px-1.5 py-0.5 rounded">config/default.yaml</code>.
      </p>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-16 rounded-lg bg-card border border-border animate-pulse" />)}
        </div>
      ) : !data || data.collectors.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground text-sm">
            No collectors configured. Edit <code className="bg-muted px-1.5 py-0.5 rounded">config/default.yaml</code> to add data sources.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {data.collectors.map((collector) => {
            const lastRun = data.recent_runs.find((r) => r.collector_id === collector.id);
            return (
              <Card key={collector.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium">{collector.name}</span>
                        <Badge variant={collector.enabled ? 'success' : 'secondary'} className="text-[0.6rem]">
                          {collector.enabled ? 'Enabled' : 'Disabled'}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span>Every {formatInterval(collector.interval_secs)}</span>
                        {lastRun && (
                          <>
                            <span>Last: <Badge variant={lastRun.status === 'success' ? 'success' : lastRun.status === 'running' ? 'warning' : 'destructive'} className="text-[0.55rem] px-1 py-0 ml-1">{lastRun.status}</Badge></span>
                            <span>{lastRun.items_count} items</span>
                          </>
                        )}
                      </div>
                    </div>
                    {collector.enabled && (
                      <Button variant="outline" size="sm" onClick={() => triggerCollector(collector.id, collector.name)}>
                        Run Now
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function formatInterval(secs: number): string {
  if (secs < 60) return `${secs}s`;
  if (secs < 3600) return `${Math.round(secs / 60)}m`;
  return `${Math.round(secs / 3600)}h`;
}
