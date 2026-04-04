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
  return <div className="h-2 bg-border/50 rounded-full overflow-hidden flex-1 min-w-3"><div className={`h-full rounded-full transition-all duration-700 ${c}`} style={{width:`${Math.min(100,pct)}%`}}/></div>;
}

interface Props { dims?: WidgetDimensions }

export default function SystemMonitor({ dims }: Props) {
  const { data, loading, error } = useWidgetData<SystemStats>('/api/system/stats', 5000);

  if (loading) return <div className="flex-1 flex items-center justify-center text-muted-foreground cq-text-sm">Loading...</div>;
  if (error) return <div className="flex-1 flex items-center justify-center text-destructive cq-text-sm">Error</div>;
  if (!data) return null;

  {/* All content rendered. CSS container queries at realistic breakpoints:
      1x1 = ~137x123  2x1 = ~297x123  1x2 = ~137x283
      2x2 = ~297x283  3x2 = ~458x283  3x3 = ~458x444 */}

  return (
    <div className="flex flex-col h-full overflow-hidden gap-1">
      {/* === SHORT LAYOUT (h < 140px — fits 1×1 and 2×1) === */}
      <div className="@min-h-[140px]:hidden flex items-center h-full gap-1">
        {/* 1×1: compact vertical stack */}
        <div className="flex @[200px]:hidden flex-col items-center justify-center gap-0.5 w-full">
          {[{ I: Cpu, p: data.cpu_percent, c: 'text-primary', l: 'CPU' },
            { I: Server, p: data.memory_percent, c: 'text-cyan-400', l: 'RAM' },
            { I: HardDrive, p: data.disk_percent, c: 'text-yellow-400', l: 'DSK' }
          ].map(({ I, p, c, l }) => (
            <div key={l} className="flex items-center gap-1 w-full">
              <I className={`w-3 h-3 ${c} shrink-0`}/>
              <Bar pct={p}/>
              <span className="cq-text-sm font-bold w-7 text-right shrink-0">{p.toFixed(0)}%</span>
            </div>
          ))}
        </div>
        {/* 2×1: horizontal with more detail */}
        <div className="hidden @[200px]:flex items-center justify-around w-full gap-2">
          {[{ I: Cpu, p: data.cpu_percent, c: 'text-primary', l: 'CPU', d: `${data.cpu_count}c` },
            { I: Server, p: data.memory_percent, c: 'text-cyan-400', l: 'RAM', d: fmtB(data.memory_used_bytes) },
            { I: HardDrive, p: data.disk_percent, c: 'text-yellow-400', l: 'Disk', d: fmtB(data.disk_used_bytes) }
          ].map(({ I, p, c, l, d }) => (
            <div key={l} className="flex flex-col items-center">
              <I className={`w-3.5 h-3.5 ${c}`}/>
              <span className="cq-text-lg font-bold">{p.toFixed(0)}%</span>
              <span className="cq-text-xs text-muted-foreground">{l}</span>
              <span className="cq-text-xs text-muted-foreground">{d}</span>
            </div>
          ))}
        </div>
      </div>

      {/* === TALL LAYOUT (h >= 140px — fits 1×2, 2×2, 3×2, 3×3) === */}
      <div className="hidden @min-h-[140px]:flex flex-col h-full gap-1 overflow-hidden">
        {/* Hostname + uptime */}
        <div className="flex items-center justify-between shrink-0">
          <span className="cq-text-sm font-medium truncate">{data.hostname}</span>
          <span className="cq-text-xs text-muted-foreground flex items-center gap-0.5"><Clock className="w-3 h-3"/>{fmtUp(data.uptime_secs)}</span>
        </div>

        {/* 3 core bars + details */}
        {[{ I: Cpu, l: 'CPU', p: data.cpu_percent, d: `${data.cpu_count} cores`, c: 'text-primary' },
          { I: Server, l: 'RAM', p: data.memory_percent, d: `${fmtB(data.memory_used_bytes)} / ${fmtB(data.memory_total_bytes)}`, c: 'text-cyan-400' },
          { I: HardDrive, l: 'Disk', p: data.disk_percent, d: `${fmtB(data.disk_used_bytes)} / ${fmtB(data.disk_total_bytes)}`, c: 'text-yellow-400' }
        ].map(({ I, l, p, d, c }) => (
          <div key={l}>
            <div className="flex items-center gap-1">
              <I className={`w-3 h-3 ${c} shrink-0`}/>
              <span className="cq-text-xs text-muted-foreground w-7 shrink-0">{l}</span>
              <Bar pct={p}/>
              <span className="cq-text-sm font-bold w-7 text-right shrink-0">{p.toFixed(0)}%</span>
            </div>
            <div className="hidden @[200px]:block cq-text-xs text-muted-foreground text-right">{d}</div>
          </div>
        ))}

        {/* Swap — at 2×2+ */}
        {data.swap_total_bytes > 0 && (
          <div className="hidden @min-h-[230px]:block">
            <div className="flex items-center gap-1">
              <Layers className="w-3 h-3 text-purple-400 shrink-0"/>
              <span className="cq-text-xs text-muted-foreground w-7 shrink-0">Swap</span>
              <Bar pct={data.swap_percent}/>
              <span className="cq-text-sm font-bold w-7 text-right shrink-0">{data.swap_percent.toFixed(0)}%</span>
            </div>
          </div>
        )}

        {/* Extra stats — at 2×2+ (h>=230 and w>=200) */}
        <div className="hidden @[200px]:@min-h-[230px]:grid grid-cols-2 gap-x-2 gap-y-0.5 py-1 border-t border-border/40 shrink-0 mt-auto">
          <div className="flex items-center gap-1"><Activity className="w-3 h-3 text-green-400 shrink-0"/><span className="cq-text-xs text-muted-foreground">Procs</span><span className="cq-text-sm font-semibold ml-auto">{data.process_count}</span></div>
          <div className="flex items-center gap-1"><Wifi className="w-3 h-3 text-blue-400 shrink-0"/><span className="cq-text-xs text-muted-foreground">RX</span><span className="cq-text-sm font-semibold ml-auto">{fmtB(data.network_rx_bytes)}</span></div>
          <div className="flex items-center gap-1"><Cpu className="w-3 h-3 text-primary shrink-0"/><span className="cq-text-xs text-muted-foreground">Cores</span><span className="cq-text-sm font-semibold ml-auto">{data.cpu_count}</span></div>
          <div className="flex items-center gap-1"><Wifi className="w-3 h-3 text-orange-400 shrink-0"/><span className="cq-text-xs text-muted-foreground">TX</span><span className="cq-text-sm font-semibold ml-auto">{fmtB(data.network_tx_bytes)}</span></div>
        </div>

        {/* OS — at 2×3+ or 3×2+ (large enough) */}
        <div className="hidden @[250px]:@min-h-[300px]:block cq-text-xs text-muted-foreground truncate border-t border-border/40 pt-0.5 shrink-0">{data.os}</div>
      </div>
    </div>
  );
}
