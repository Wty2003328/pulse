import { useWidgetData } from '../../hooks/useWidgetData';
import { Cpu, HardDrive, Server, Clock } from 'lucide-react';
import type { WidgetDimensions } from '../../lib/widget-size';

interface SystemStats {
  hostname: string; uptime_secs: number; cpu_percent: number;
  memory_used_bytes: number; memory_total_bytes: number; memory_percent: number;
  disk_used_bytes: number; disk_total_bytes: number; disk_percent: number;
}

function fmtB(b: number): string { if(b>=1e12) return `${(b/1e12).toFixed(1)}TB`; if(b>=1e9) return `${(b/1e9).toFixed(1)}GB`; if(b>=1e6) return `${(b/1e6).toFixed(0)}MB`; return `${(b/1e3).toFixed(0)}KB`; }
function fmtUp(s: number): string { const d=Math.floor(s/86400),h=Math.floor((s%86400)/3600),m=Math.floor((s%3600)/60); if(d>0)return`${d}d ${h}h`; if(h>0)return`${h}h ${m}m`; return`${m}m`; }

function Bar({ pct, color }: { pct: number; color: string }) {
  return <div className="h-2.5 bg-border/50 rounded-full overflow-hidden"><div className={`h-full rounded-full transition-all duration-700 ${color}`} style={{ width: `${Math.min(100, pct)}%` }} /></div>;
}

function barColor(p: number) { return p > 90 ? 'bg-destructive' : p > 70 ? 'bg-warning' : 'bg-primary'; }

interface Props { dims?: WidgetDimensions }

export default function SystemMonitor({ dims }: Props) {
  const { data, loading, error } = useWidgetData<SystemStats>('/api/system/stats', 5000);
  const size = dims?.size ?? 'large';
  const ori = dims?.orientation ?? 'square';

  if (loading) return <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">Loading...</div>;
  if (error) return <div className="flex-1 flex items-center justify-center text-destructive text-sm">Error</div>;
  if (!data) return null;

  /* Small */
  if (size === 'small') {
    return (
      <div className="flex flex-col h-full items-center justify-center gap-1">
        <Cpu className="w-5 h-5 text-primary" />
        <span className="text-2xl font-bold">{data.cpu_percent.toFixed(0)}%</span>
        <span className="text-xs text-muted-foreground">CPU</span>
      </div>
    );
  }

  /* Medium */
  if (size === 'medium') {
    if (ori === 'wide') {
      // Horizontal: 3 stats side by side
      return (
        <div className="flex h-full items-center gap-4 justify-around">
          {[
            { icon: Cpu, label: 'CPU', pct: data.cpu_percent, color: 'text-primary' },
            { icon: Server, label: 'RAM', pct: data.memory_percent, color: 'text-cyan-400' },
            { icon: HardDrive, label: 'Disk', pct: data.disk_percent, color: 'text-yellow-400' },
          ].map(({ icon: I, label, pct, color }) => (
            <div key={label} className="flex flex-col items-center gap-1">
              <I className={`w-4 h-4 ${color}`} />
              <span className="text-lg font-bold">{pct.toFixed(0)}%</span>
              <span className="text-xs text-muted-foreground">{label}</span>
            </div>
          ))}
        </div>
      );
    }
    // Tall or square: stacked bars
    return (
      <div className="flex flex-col h-full justify-center gap-2.5">
        {[
          { icon: Cpu, label: 'CPU', pct: data.cpu_percent },
          { icon: Server, label: 'RAM', pct: data.memory_percent },
          { icon: HardDrive, label: 'Disk', pct: data.disk_percent },
        ].map(({ icon: I, label, pct }) => (
          <div key={label}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-muted-foreground flex items-center gap-1"><I className="w-3.5 h-3.5" />{label}</span>
              <span className="text-sm font-bold">{pct.toFixed(0)}%</span>
            </div>
            <Bar pct={pct} color={barColor(pct)} />
          </div>
        ))}
      </div>
    );
  }

  /* Large: card grid with full detail */
  return (
    <div className="flex flex-col h-full gap-3">
      <div className="flex items-center justify-between">
        <span className="text-base font-semibold">{data.hostname}</span>
        <span className="text-sm text-muted-foreground flex items-center gap-1"><Clock className="w-4 h-4" />{fmtUp(data.uptime_secs)}</span>
      </div>
      <div className="grid grid-cols-3 gap-4 flex-1">
        {[
          { icon: Cpu, label: 'CPU Usage', pct: data.cpu_percent, detail: '', color: 'text-primary' },
          { icon: Server, label: 'Memory', pct: data.memory_percent, detail: `${fmtB(data.memory_used_bytes)} / ${fmtB(data.memory_total_bytes)}`, color: 'text-cyan-400' },
          { icon: HardDrive, label: 'Disk', pct: data.disk_percent, detail: `${fmtB(data.disk_used_bytes)} / ${fmtB(data.disk_total_bytes)}`, color: 'text-yellow-400' },
        ].map(({ icon: I, label, pct, detail, color }) => (
          <div key={label} className="flex flex-col items-center justify-center bg-muted rounded-lg p-3">
            <I className={`w-6 h-6 ${color} mb-2`} />
            <span className="text-2xl font-bold">{pct.toFixed(1)}%</span>
            <span className="text-xs text-muted-foreground mt-1">{label}</span>
            <div className="w-full mt-2"><Bar pct={pct} color={barColor(pct)} /></div>
            {detail && <span className="text-xs text-muted-foreground mt-1">{detail}</span>}
          </div>
        ))}
      </div>
    </div>
  );
}
