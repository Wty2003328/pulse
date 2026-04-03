import { useState } from 'react';
import { useWidgetData } from '../../hooks/useWidgetData';
import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Loader2, Pencil, Check, X } from 'lucide-react';
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

  const saveInterval = async (id: string, name: string, secs: number) => {
    try {
      const res = await fetch(`/api/settings/collectors/${id}/interval`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ interval_secs: secs }),
      });
      if (res.ok) {
        onToast(`${name} interval updated to ${formatInterval(secs)}`, 'success');
        refetch();
      } else {
        const err = await res.text();
        onToast(`Failed: ${err}`, 'error');
      }
    } catch {
      onToast('Failed to save interval', 'error');
    }
  };

  return (
    <div>
      <h2 className="text-lg font-semibold mb-1">Data Sources</h2>
      <p className="text-sm text-muted-foreground mb-6">
        Active collectors that feed the dashboard. Add or remove sources in <code className="text-xs bg-muted px-1.5 py-0.5 rounded">config/default.yaml</code>.
      </p>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-20 rounded-lg bg-card border border-border animate-pulse" />)}
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
              <CollectorRow
                key={collector.id}
                collector={collector}
                lastRun={lastRun}
                onTrigger={() => triggerCollector(collector.id, collector.name)}
                onSaveInterval={(secs) => saveInterval(collector.id, collector.name, secs)}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

function CollectorRow({
  collector,
  lastRun,
  onTrigger,
  onSaveInterval,
}: {
  collector: { id: string; name: string; enabled: boolean; interval_secs: number };
  lastRun?: { status: string; items_count: number } | null;
  onTrigger: () => void;
  onSaveInterval: (secs: number) => void;
}) {
  const [editingInterval, setEditingInterval] = useState(false);
  const [intervalValue, setIntervalValue] = useState(String(collector.interval_secs));
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    const secs = parseInt(intervalValue, 10);
    if (isNaN(secs) || secs < 10) return;
    setSaving(true);
    await onSaveInterval(secs);
    setSaving(false);
    setEditingInterval(false);
  };

  const handleCancel = () => {
    setIntervalValue(String(collector.interval_secs));
    setEditingInterval(false);
  };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-sm font-medium">{collector.name}</span>
              <Badge variant={collector.enabled ? 'success' : 'secondary'} className="text-[0.6rem]">
                {collector.enabled ? 'Enabled' : 'Disabled'}
              </Badge>
            </div>

            {/* Interval row */}
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs text-muted-foreground">Refresh:</span>
              {editingInterval ? (
                <div className="flex items-center gap-1.5">
                  <Input
                    type="number"
                    min="10"
                    value={intervalValue}
                    onChange={(e) => setIntervalValue(e.target.value)}
                    className="h-6 w-20 text-xs px-2"
                    autoFocus
                    onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') handleCancel(); }}
                  />
                  <span className="text-xs text-muted-foreground">sec</span>
                  <button onClick={handleSave} disabled={saving} className="text-success hover:text-success/80 cursor-pointer">
                    {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  </button>
                  <button onClick={handleCancel} className="text-muted-foreground hover:text-foreground cursor-pointer">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setEditingInterval(true)}
                  className="flex items-center gap-1 text-xs text-foreground hover:text-primary transition-colors cursor-pointer group"
                >
                  <span className="font-medium">{formatInterval(collector.interval_secs)}</span>
                  <Pencil className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              )}
            </div>

            {/* Last run info */}
            {lastRun && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>Last run:</span>
                <Badge
                  variant={lastRun.status === 'success' ? 'success' : lastRun.status === 'running' ? 'warning' : 'destructive'}
                  className="text-[0.55rem] px-1 py-0"
                >
                  {lastRun.status}
                </Badge>
                <span>{lastRun.items_count} items</span>
              </div>
            )}
          </div>

          {collector.enabled && (
            <Button variant="outline" size="sm" className="shrink-0" onClick={onTrigger}>
              Run Now
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function formatInterval(secs: number): string {
  if (secs < 60) return `${secs}s`;
  if (secs < 3600) return `${Math.round(secs / 60)}m`;
  return `${(secs / 3600).toFixed(1).replace(/\.0$/, '')}h`;
}
