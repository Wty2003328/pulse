import { useWidgetData } from '../../hooks/useWidgetData';
import { Cpu, HardDrive, Server, Clock } from 'lucide-react';
import type { WidgetDimensions } from '../../lib/widget-size';

interface SystemStats {
  hostname: string; uptime_secs: number;
  cpu_percent: number;
  memory_used_bytes: number; memory_total_bytes: number; memory_percent: number;
  disk_used_bytes: number; disk_total_bytes: number; disk_percent: number;
}

function fmtBytes(b: number): string {
  if (b >= 1e12) return `${(b / 1e12).toFixed(1)} TB`;
  if (b >= 1e9) return `${(b / 1e9).toFixed(1)} GB`;
  if (b >= 1e6) return `${(b / 1e6).toFixed(0)} MB`;
  return `${(b / 1e3).toFixed(0)} KB`;
}

function fmtUptime(s: number): string {
  const d = Math.floor(s / 86400); const h = Math.floor((s % 86400) / 3600); const m = Math.floor((s % 3600) / 60);
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function Bar({ pct, color }: { pct: number; color: string }) {
  return (
    <div className="h-2.5 bg-border/50 rounded-full overflow-hidden">
      <div className={`h-full rounded-full transition-all duration-700 ${color}`} style={{ width: `${Math.min(100, pct)}%` }} />
    </div>
  );
}

function barColor(pct: number): string {
  if (pct > 90) return 'bg-destructive'; if (pct > 70) return 'bg-warning'; return 'bg-primary';
}

interface Props { dims?: WidgetDimensions }

export default function SystemMonitor({ dims }: Props) {
  const { data, loading, error } = useWidgetData<SystemStats>('/api/system/stats', 5000);
  const size = dims?.size ?? 'medium';

  if (loading) return <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">Loading...</div>;
  if (error) return <div className="flex-1 flex items-center justify-center text-destructive text-sm">Error</div>;
  if (!data) return null;

  /* Small */
  if (size === 'small') {
    return (
      <div className="flex flex-col h-full justify-center gap-2.5">
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-muted-foreground flex items-center gap-1"><Cpu className="w-3.5 h-3.5" />CPU</span>
            <span className="text-sm font-bold">{data.cpu_percent.toFixed(0)}%</span>
          </div>
          <Bar pct={data.cpu_percent} color={barColor(data.cpu_percent)} />
        </div>
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-muted-foreground flex items-center gap-1"><Server className="w-3.5 h-3.5" />RAM</span>
            <span className="text-sm font-bold">{data.memory_percent.toFixed(0)}%</span>
          </div>
          <Bar pct={data.memory_percent} color={barColor(data.memory_percent)} />
        </div>
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-muted-foreground flex items-center gap-1"><HardDrive className="w-3.5 h-3.5" />Disk</span>
            <span className="text-sm font-bold">{data.disk_percent.toFixed(0)}%</span>
          </div>
          <Bar pct={data.disk_percent} color={barColor(data.disk_percent)} />
        </div>
      </div>
    );
  }

  /* Medium */
  if (size === 'medium') {
    return (
      <div className="flex flex-col h-full gap-2.5">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium truncate">{data.hostname}</span>
          <span className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{fmtUptime(data.uptime_secs)}</span>
        </div>
        <div>
          <div className="flex items-center justify-between mb-1"><span className="text-xs text-muted-foreground flex items-center gap-1"><Cpu className="w-3.5 h-3.5 text-primary" />CPU</span><span className="text-sm font-bold">{data.cpu_percent.toFixed(1)}%</span></div>
          <Bar pct={data.cpu_percent} color={barColor(data.cpu_percent)} />
        </div>
        <div>
          <div className="flex items-center justify-between mb-1"><span className="text-xs text-muted-foreground flex items-center gap-1"><Server className="w-3.5 h-3.5 text-cyan-400" />Memory</span><span className="text-sm font-bold">{data.memory_percent.toFixed(1)}%</span></div>
          <Bar pct={data.memory_percent} color={barColor(data.memory_percent)} />
          <div className="text-xs text-muted-foreground mt-0.5 text-right">{fmtBytes(data.memory_used_bytes)} / {fmtBytes(data.memory_total_bytes)}</div>
        </div>
        <div>
          <div className="flex items-center justify-between mb-1"><span className="text-xs text-muted-foreground flex items-center gap-1"><HardDrive className="w-3.5 h-3.5 text-yellow-400" />Disk</span><span className="text-sm font-bold">{data.disk_percent.toFixed(1)}%</span></div>
          <Bar pct={data.disk_percent} color={barColor(data.disk_percent)} />
          <div className="text-xs text-muted-foreground mt-0.5 text-right">{fmtBytes(data.disk_used_bytes)} / {fmtBytes(data.disk_total_bytes)}</div>
        </div>
      </div>
    );
  }

  /* Large: bigger bars with ring-style numbers + all details */
  return (
    <div className="flex flex-col h-full gap-3">
      <div className="flex items-center justify-between">
        <span className="text-base font-semibold">{data.hostname}</span>
        <span className="text-sm text-muted-foreground flex items-center gap-1"><Clock className="w-4 h-4" />Uptime: {fmtUptime(data.uptime_secs)}</span>
      </div>

      <div className="grid grid-cols-3 gap-4 flex-1">
        {/* CPU */}
        <div className="flex flex-col items-center justify-center bg-muted rounded-lg p-3">
          <Cpu className="w-6 h-6 text-primary mb-2" />
          <span className="text-2xl font-bold">{data.cpu_percent.toFixed(1)}%</span>
          <span className="text-xs text-muted-foreground mt-1">CPU Usage</span>
          <div className="w-full mt-2"><Bar pct={data.cpu_percent} color={barColor(data.cpu_percent)} /></div>
        </div>
        {/* Memory */}
        <div className="flex flex-col items-center justify-center bg-muted rounded-lg p-3">
          <Server className="w-6 h-6 text-cyan-400 mb-2" />
          <span className="text-2xl font-bold">{data.memory_percent.toFixed(1)}%</span>
          <span className="text-xs text-muted-foreground mt-1">Memory</span>
          <div className="w-full mt-2"><Bar pct={data.memory_percent} color={barColor(data.memory_percent)} /></div>
          <span className="text-[0.7rem] text-muted-foreground mt-1">{fmtBytes(data.memory_used_bytes)} / {fmtBytes(data.memory_total_bytes)}</span>
        </div>
        {/* Disk */}
        <div className="flex flex-col items-center justify-center bg-muted rounded-lg p-3">
          <HardDrive className="w-6 h-6 text-yellow-400 mb-2" />
          <span className="text-2xl font-bold">{data.disk_percent.toFixed(1)}%</span>
          <span className="text-xs text-muted-foreground mt-1">Disk</span>
          <div className="w-full mt-2"><Bar pct={data.disk_percent} color={barColor(data.disk_percent)} /></div>
          <span className="text-[0.7rem] text-muted-foreground mt-1">{fmtBytes(data.disk_used_bytes)} / {fmtBytes(data.disk_total_bytes)}</span>
        </div>
      </div>
    </div>
  );
}
