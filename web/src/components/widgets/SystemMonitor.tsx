import { useWidgetData } from '../../hooks/useWidgetData';
import { Cpu, HardDrive, Server, Clock } from 'lucide-react';
import type { WidgetDimensions } from '../../lib/widget-size';

interface SystemStats {
  hostname: string;
  uptime_secs: number;
  cpu_percent: number;
  memory_used_bytes: number;
  memory_total_bytes: number;
  memory_percent: number;
  disk_used_bytes: number;
  disk_total_bytes: number;
  disk_percent: number;
}

function formatBytes(bytes: number): string {
  if (bytes >= 1e12) return `${(bytes / 1e12).toFixed(1)} TB`;
  if (bytes >= 1e9) return `${(bytes / 1e9).toFixed(1)} GB`;
  if (bytes >= 1e6) return `${(bytes / 1e6).toFixed(0)} MB`;
  return `${(bytes / 1e3).toFixed(0)} KB`;
}

function formatUptime(secs: number): string {
  const d = Math.floor(secs / 86400);
  const h = Math.floor((secs % 86400) / 3600);
  const m = Math.floor((secs % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function Bar({ pct, color }: { pct: number; color: string }) {
  return (
    <div className="h-1.5 bg-border/60 rounded-full overflow-hidden">
      <div className={`h-full rounded-full transition-all duration-500 ${color}`} style={{ width: `${Math.min(100, pct)}%` }} />
    </div>
  );
}

function barColor(pct: number): string {
  if (pct > 90) return 'bg-destructive';
  if (pct > 70) return 'bg-warning';
  return 'bg-primary';
}

interface Props { dims?: WidgetDimensions }

export default function SystemMonitor({ dims }: Props) {
  const { data, loading, error } = useWidgetData<SystemStats>('/api/system/stats', 5000);
  const size = dims?.size ?? 'medium';

  if (loading) return <div className="flex-1 flex items-center justify-center text-muted-foreground text-xs">Loading...</div>;
  if (error) return <div className="flex-1 flex items-center justify-center text-destructive text-xs">Error</div>;
  if (!data) return null;

  /* Small: compact 3-bar overview */
  if (size === 'small') {
    return (
      <div className="flex flex-col h-full justify-center gap-2">
        <div>
          <div className="flex items-center justify-between mb-0.5">
            <span className="text-[0.55rem] text-muted-foreground flex items-center gap-1"><Cpu className="w-2.5 h-2.5" />CPU</span>
            <span className="text-[0.65rem] font-semibold">{data.cpu_percent.toFixed(0)}%</span>
          </div>
          <Bar pct={data.cpu_percent} color={barColor(data.cpu_percent)} />
        </div>
        <div>
          <div className="flex items-center justify-between mb-0.5">
            <span className="text-[0.55rem] text-muted-foreground flex items-center gap-1"><Server className="w-2.5 h-2.5" />RAM</span>
            <span className="text-[0.65rem] font-semibold">{data.memory_percent.toFixed(0)}%</span>
          </div>
          <Bar pct={data.memory_percent} color={barColor(data.memory_percent)} />
        </div>
        <div>
          <div className="flex items-center justify-between mb-0.5">
            <span className="text-[0.55rem] text-muted-foreground flex items-center gap-1"><HardDrive className="w-2.5 h-2.5" />Disk</span>
            <span className="text-[0.65rem] font-semibold">{data.disk_percent.toFixed(0)}%</span>
          </div>
          <Bar pct={data.disk_percent} color={barColor(data.disk_percent)} />
        </div>
      </div>
    );
  }

  /* Medium / Large */
  return (
    <div className="flex flex-col h-full gap-2">
      {/* Host info */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-foreground truncate">{data.hostname}</span>
        <span className="text-[0.6rem] text-muted-foreground flex items-center gap-0.5"><Clock className="w-3 h-3" />{formatUptime(data.uptime_secs)}</span>
      </div>

      {/* CPU */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="text-[0.6rem] text-muted-foreground flex items-center gap-1"><Cpu className="w-3 h-3 text-primary" />CPU</span>
          <span className="text-xs font-semibold">{data.cpu_percent.toFixed(1)}%</span>
        </div>
        <Bar pct={data.cpu_percent} color={barColor(data.cpu_percent)} />
      </div>

      {/* Memory */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="text-[0.6rem] text-muted-foreground flex items-center gap-1"><Server className="w-3 h-3 text-cyan-400" />Memory</span>
          <span className="text-xs font-semibold">{data.memory_percent.toFixed(1)}%</span>
        </div>
        <Bar pct={data.memory_percent} color={barColor(data.memory_percent)} />
        <div className="text-[0.55rem] text-muted-foreground mt-0.5 text-right">
          {formatBytes(data.memory_used_bytes)} / {formatBytes(data.memory_total_bytes)}
        </div>
      </div>

      {/* Disk */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="text-[0.6rem] text-muted-foreground flex items-center gap-1"><HardDrive className="w-3 h-3 text-yellow-400" />Disk</span>
          <span className="text-xs font-semibold">{data.disk_percent.toFixed(1)}%</span>
        </div>
        <Bar pct={data.disk_percent} color={barColor(data.disk_percent)} />
        <div className="text-[0.55rem] text-muted-foreground mt-0.5 text-right">
          {formatBytes(data.disk_used_bytes)} / {formatBytes(data.disk_total_bytes)}
        </div>
      </div>
    </div>
  );
}
