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
  const c = pct > 90 ? 'bg-destructive' : pct > 70 ? 'bg-warning' : 'bg-primary';
  return <div className="h-2 bg-border/50 rounded-full overflow-hidden flex-1 min-w-4"><div className={`h-full rounded-full transition-all duration-700 ${c}`} style={{width:`${Math.min(100,pct)}%`}}/></div>;
}

interface Props { dims?: WidgetDimensions }

export default function SystemMonitor({ dims }: Props) {
  const { data, loading, error } = useWidgetData<SystemStats>('/api/system/stats', 5000);

  if (loading) return <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">Loading...</div>;
  if (error) return <div className="flex-1 flex items-center justify-center text-destructive text-sm">Error</div>;
  if (!data) return null;

  const metrics = [
    { icon: Cpu, label: 'CPU', pct: data.cpu_percent, detail: `${data.cpu_count} cores`, color: 'text-primary' },
    { icon: Server, label: 'RAM', pct: data.memory_percent, detail: `${fmtB(data.memory_used_bytes)}/${fmtB(data.memory_total_bytes)}`, color: 'text-cyan-400' },
    { icon: HardDrive, label: 'Disk', pct: data.disk_percent, detail: `${fmtB(data.disk_used_bytes)}/${fmtB(data.disk_total_bytes)}`, color: 'text-yellow-400' },
  ];

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header — needs height */}
      <div className="hidden @min-h-[100px]:flex items-center justify-between shrink-0 mb-1">
        <span className="text-xs font-medium truncate">{data.hostname}</span>
        <span className="text-xs text-muted-foreground flex items-center gap-0.5"><Clock className="w-3 h-3"/>{fmtUp(data.uptime_secs)}</span>
      </div>

      {/* Core metrics: horizontal when short, vertical when tall */}
      {/* Short container (< 100px height): horizontal layout */}
      <div className="flex @min-h-[100px]:hidden items-center justify-around h-full gap-2">
        {metrics.map(({ icon: I, pct, color }) => (
          <div key={pct} className="flex flex-col items-center gap-0.5">
            <I className={`w-3.5 h-3.5 ${color}`} />
            <span className="text-sm font-bold">{pct.toFixed(0)}%</span>
          </div>
        ))}
      </div>

      {/* Tall container (>= 100px height): vertical bars */}
      <div className="hidden @min-h-[100px]:flex flex-col justify-center gap-1.5 flex-1">
        {metrics.map(({ icon: I, label, pct, detail, color }) => (
          <div key={label}>
            <div className="flex items-center gap-1.5">
              <I className={`w-3.5 h-3.5 ${color} shrink-0`} />
              <span className="hidden @[150px]:inline text-xs text-muted-foreground w-8 shrink-0">{label}</span>
              <Bar pct={pct} />
              <span className="text-xs font-bold w-8 text-right shrink-0">{pct.toFixed(0)}%</span>
            </div>
            <div className="hidden @[200px]:block text-xs text-muted-foreground text-right mt-0.5">{detail}</div>
          </div>
        ))}

        {data.swap_total_bytes > 0 && (
          <div className="hidden @[250px]:block">
            <div className="flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-purple-400 shrink-0" />
              <span className="text-xs text-muted-foreground w-8 shrink-0">Swap</span>
              <Bar pct={data.swap_percent} />
              <span className="text-xs font-bold w-8 text-right shrink-0">{data.swap_percent.toFixed(0)}%</span>
            </div>
          </div>
        )}
      </div>

      {/* Extra stats */}
      <div className="hidden @[300px]:grid @min-h-[200px]:grid grid-cols-2 gap-x-4 gap-y-1 py-1.5 border-t border-border/40 shrink-0">
        <div className="flex items-center gap-1.5"><Activity className="w-3.5 h-3.5 text-green-400 shrink-0"/><div><div className="text-xs text-muted-foreground">Processes</div><div className="text-sm font-semibold">{data.process_count}</div></div></div>
        <div className="flex items-center gap-1.5"><Cpu className="w-3.5 h-3.5 text-primary shrink-0"/><div><div className="text-xs text-muted-foreground">Cores</div><div className="text-sm font-semibold">{data.cpu_count}</div></div></div>
        <div className="flex items-center gap-1.5"><Wifi className="w-3.5 h-3.5 text-blue-400 shrink-0"/><div><div className="text-xs text-muted-foreground">Net RX</div><div className="text-sm font-semibold">{fmtB(data.network_rx_bytes)}</div></div></div>
        <div className="flex items-center gap-1.5"><Wifi className="w-3.5 h-3.5 text-orange-400 shrink-0"/><div><div className="text-xs text-muted-foreground">Net TX</div><div className="text-sm font-semibold">{fmtB(data.network_tx_bytes)}</div></div></div>
      </div>

      {data.os && <div className="hidden @[350px]:block @min-h-[250px]:block text-xs text-muted-foreground truncate border-t border-border/40 pt-1 shrink-0">{data.os}{data.kernel ? ` (${data.kernel})` : ''}</div>}
    </div>
  );
}
