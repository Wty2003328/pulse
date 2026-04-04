import { useWidgetData } from '../../hooks/useWidgetData';
import { Cpu, HardDrive, Server, Clock, Activity, Layers, Wifi } from 'lucide-react';
import type { WidgetDimensions } from '../../lib/widget-size';

interface SystemStats {
  hostname: string; os: string; kernel: string; uptime_secs: number;
  cpu_percent: number; cpu_count: number;
  memory_used_bytes: number; memory_total_bytes: number; memory_percent: number;
  swap_used_bytes: number; swap_total_bytes: number; swap_percent: number;
  disk_used_bytes: number; disk_total_bytes: number; disk_percent: number;
  process_count: number; network_rx_bytes: number; network_tx_bytes: number;
}

function fmtB(b: number) { if(b>=1e12)return`${(b/1e12).toFixed(1)}TB`;if(b>=1e9)return`${(b/1e9).toFixed(1)}GB`;if(b>=1e6)return`${(b/1e6).toFixed(0)}MB`;return`${(b/1e3).toFixed(0)}KB`; }
function fmtUp(s: number) { const d=Math.floor(s/86400),h=Math.floor((s%86400)/3600),m=Math.floor((s%3600)/60);if(d>0)return`${d}d ${h}h`;if(h>0)return`${h}h ${m}m`;return`${m}m`; }

function Bar({ pct }: { pct: number }) {
  const color = pct > 90 ? 'bg-destructive' : pct > 70 ? 'bg-warning' : 'bg-primary';
  return <div className="h-2 bg-border/50 rounded-full overflow-hidden flex-1"><div className={`h-full rounded-full transition-all duration-700 ${color}`} style={{ width: `${Math.min(100, pct)}%` }} /></div>;
}

function Metric({ icon: I, label, pct, detail, color }: { icon: React.ElementType; label: string; pct: number; detail?: string; color: string }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-0.5">
        <span className="text-xs text-muted-foreground flex items-center gap-1"><I className={`w-3.5 h-3.5 ${color}`} />{label}</span>
        <span className="text-sm font-bold">{pct.toFixed(0)}%</span>
      </div>
      <Bar pct={pct} />
      {detail && <div className="text-xs text-muted-foreground mt-0.5 text-right">{detail}</div>}
    </div>
  );
}

interface Props { dims?: WidgetDimensions }

export default function SystemMonitor({ dims }: Props) {
  const { data, loading, error } = useWidgetData<SystemStats>('/api/system/stats', 5000);
  const size = dims?.size ?? 'large';
  const ori = dims?.orientation ?? 'square';

  if (loading) return <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">Loading...</div>;
  if (error) return <div className="flex-1 flex items-center justify-center text-destructive text-sm">Error</div>;
  if (!data) return null;

  const metrics = [
    { icon: Cpu, label: 'CPU', pct: data.cpu_percent, detail: `${data.cpu_count} cores`, color: 'text-primary' },
    { icon: Server, label: 'RAM', pct: data.memory_percent, detail: `${fmtB(data.memory_used_bytes)} / ${fmtB(data.memory_total_bytes)}`, color: 'text-cyan-400' },
    { icon: HardDrive, label: 'Disk', pct: data.disk_percent, detail: `${fmtB(data.disk_used_bytes)} / ${fmtB(data.disk_total_bytes)}`, color: 'text-yellow-400' },
  ];

  /* Small */
  if (size === 'small') {
    return (
      <div className="flex flex-col h-full justify-center gap-1.5">
        {metrics.map(({ icon: I, label, pct, color }) => (
          <div key={label} className="flex items-center gap-1.5">
            <I className={`w-3 h-3 ${color} shrink-0`} />
            <Bar pct={pct} />
            <span className="text-xs font-bold w-7 text-right shrink-0">{pct.toFixed(0)}%</span>
          </div>
        ))}
      </div>
    );
  }

  /* Medium — consistent layout for all orientations */
  if (size === 'medium') {
    if (ori === 'wide') {
      // Horizontal: 3 metrics side by side with bars underneath
      return (
        <div className="flex h-full items-center gap-3">
          {metrics.map(({ icon: I, label, pct, color }) => (
            <div key={label} className="flex-1 text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <I className={`w-3.5 h-3.5 ${color}`} />
                <span className="text-xs text-muted-foreground">{label}</span>
              </div>
              <span className="text-lg font-bold block">{pct.toFixed(0)}%</span>
              <div className="mt-1"><Bar pct={pct} /></div>
            </div>
          ))}
        </div>
      );
    }
    // Tall or square: stacked bars with details
    return (
      <div className="flex flex-col h-full justify-center gap-2">
        <div className="flex items-center justify-between mb-0.5">
          <span className="text-xs font-medium truncate">{data.hostname}</span>
          <span className="text-xs text-muted-foreground flex items-center gap-0.5"><Clock className="w-3 h-3" />{fmtUp(data.uptime_secs)}</span>
        </div>
        {metrics.map((m) => <Metric key={m.label} {...m} />)}
      </div>
    );
  }

  /* Large: full with swap, processes, network, OS info */
  return (
    <div className="flex flex-col h-full gap-2 overflow-hidden">
      <div className="flex items-center justify-between">
        <span className="text-base font-semibold">{data.hostname}</span>
        <span className="text-sm text-muted-foreground flex items-center gap-1"><Clock className="w-4 h-4" />{fmtUp(data.uptime_secs)}</span>
      </div>

      {/* Main metrics */}
      <div className="space-y-2">
        {metrics.map((m) => <Metric key={m.label} {...m} />)}
        {data.swap_total_bytes > 0 && (
          <Metric icon={Layers} label="Swap" pct={data.swap_percent} detail={`${fmtB(data.swap_used_bytes)} / ${fmtB(data.swap_total_bytes)}`} color="text-purple-400" />
        )}
      </div>

      {/* Extra stats */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 py-2 border-t border-border/40 mt-auto">
        <div className="flex items-center gap-1.5">
          <Activity className="w-3.5 h-3.5 text-green-400 shrink-0" />
          <div><div className="text-xs text-muted-foreground">Processes</div><div className="text-sm font-semibold">{data.process_count}</div></div>
        </div>
        <div className="flex items-center gap-1.5">
          <Cpu className="w-3.5 h-3.5 text-primary shrink-0" />
          <div><div className="text-xs text-muted-foreground">CPU Cores</div><div className="text-sm font-semibold">{data.cpu_count}</div></div>
        </div>
        <div className="flex items-center gap-1.5">
          <Wifi className="w-3.5 h-3.5 text-blue-400 shrink-0" />
          <div><div className="text-xs text-muted-foreground">Net RX</div><div className="text-sm font-semibold">{fmtB(data.network_rx_bytes)}</div></div>
        </div>
        <div className="flex items-center gap-1.5">
          <Wifi className="w-3.5 h-3.5 text-orange-400 shrink-0" />
          <div><div className="text-xs text-muted-foreground">Net TX</div><div className="text-sm font-semibold">{fmtB(data.network_tx_bytes)}</div></div>
        </div>
      </div>

      {/* OS info */}
      {data.os && <div className="text-xs text-muted-foreground truncate border-t border-border/40 pt-1">{data.os}{data.kernel ? ` (${data.kernel})` : ''}</div>}
    </div>
  );
}
