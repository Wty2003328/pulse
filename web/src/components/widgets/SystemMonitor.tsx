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
  return <div className="h-2.5 bg-border/50 rounded-full overflow-hidden flex-1 min-w-3"><div className={`h-full rounded-full transition-all duration-700 ${c}`} style={{width:`${Math.min(100,pct)}%`}}/></div>;
}

interface Props { dims?: WidgetDimensions }

export default function SystemMonitor({ dims }: Props) {
  const { data, loading, error } = useWidgetData<SystemStats>('/api/system/stats', 5000);

  if (loading) return <div className="flex-1 flex items-center justify-center text-muted-foreground cq-text-sm">Loading...</div>;
  if (error) return <div className="flex-1 flex items-center justify-center text-destructive cq-text-sm">Error</div>;
  if (!data) return null;

  const metrics = [
    { icon: Cpu, label: 'CPU', pct: data.cpu_percent, sub: `${data.cpu_count}c`, detail: `${data.cpu_count} cores`, color: 'text-primary' },
    { icon: Server, label: 'RAM', pct: data.memory_percent, sub: fmtB(data.memory_used_bytes), detail: `${fmtB(data.memory_used_bytes)} / ${fmtB(data.memory_total_bytes)}`, color: 'text-cyan-400' },
    { icon: HardDrive, label: 'Disk', pct: data.disk_percent, sub: fmtB(data.disk_used_bytes), detail: `${fmtB(data.disk_used_bytes)} / ${fmtB(data.disk_total_bytes)}`, color: 'text-yellow-400' },
  ];

  return (
    <div className="flex flex-col h-full overflow-hidden gap-1">
      {/* Short layout (h<90px): horizontal icons+% */}
      <div className="cqh-short-flex items-center justify-around h-full hidden">
        {metrics.map(({ icon: I, pct, color, label }) => (
          <div key={label} className="flex flex-col items-center">
            <I className={`w-3.5 h-3.5 ${color}`}/>
            <span className="cq-text-lg font-bold">{pct.toFixed(0)}%</span>
          </div>
        ))}
      </div>

      {/* Tall layout (h>=90px): vertical bars */}
      <div className="cqh-tall-flex flex-col h-full gap-2 hidden">
        {/* Hostname — at h>=120px */}
        <div className="hidden cqh-120 items-center justify-between shrink-0">
          <span className="cq-text-sm font-medium truncate">{data.hostname}</span>
          <span className="cq-text-xs text-muted-foreground flex items-center gap-0.5"><Clock className="w-3 h-3"/>{fmtUp(data.uptime_secs)}</span>
        </div>

        {/* Core 3 bars — flex-1 each to fill space */}
        {metrics.map(({ icon: I, label, pct, sub, detail, color }) => (
          <div key={label} className="flex flex-col justify-center flex-1 min-h-0">
            <div className="flex items-center gap-1.5">
              <I className={`w-5 h-5 ${color} shrink-0`}/>
              <span className="hidden @[130px]:inline cq-text-sm text-muted-foreground shrink-0">{label}</span>
              <Bar pct={pct}/>
              <span className="cq-text-lg font-bold shrink-0">{pct.toFixed(0)}%</span>
            </div>
            <div className="hidden @[130px]:block @[200px]:hidden cq-text-xs text-muted-foreground ml-7">{sub}</div>
            <div className="hidden @[200px]:block cq-text-xs text-muted-foreground ml-7">{detail}</div>
          </div>
        ))}

        {/* Swap — at h>=230px */}
        {data.swap_total_bytes > 0 && (
          <div className="hidden cqh-230-block">
            <div className="flex items-center gap-1.5">
              <Layers className="w-5 h-5 text-purple-400 shrink-0"/>
              <span className="cq-text-sm text-muted-foreground shrink-0">Swap</span>
              <Bar pct={data.swap_percent}/>
              <span className="cq-text-lg font-bold shrink-0">{data.swap_percent.toFixed(0)}%</span>
            </div>
          </div>
        )}

        {/* Extra stats — at w>=180px and h>=200px */}
        <div className="hidden cqwh-180-200-grid grid-cols-2 gap-1 py-1 border-t border-border/30 shrink-0">
          <div className="flex items-center gap-1"><Activity className="w-3.5 h-3.5 text-green-400"/><span className="cq-text-xs">{data.process_count} procs</span></div>
          <div className="flex items-center gap-1"><Wifi className="w-3.5 h-3.5 text-blue-400"/><span className="cq-text-xs">RX {fmtB(data.network_rx_bytes)}</span></div>
          <div className="flex items-center gap-1"><Cpu className="w-3.5 h-3.5 text-primary"/><span className="cq-text-xs">{data.cpu_count} cores</span></div>
          <div className="flex items-center gap-1"><Wifi className="w-3.5 h-3.5 text-orange-400"/><span className="cq-text-xs">TX {fmtB(data.network_tx_bytes)}</span></div>
        </div>

        {/* OS — at w>=250px and h>=300px */}
        <div className="hidden cqwh-250-300-block cq-text-xs text-muted-foreground truncate border-t border-border/30 pt-0.5 shrink-0">{data.os}</div>
      </div>
    </div>
  );
}
