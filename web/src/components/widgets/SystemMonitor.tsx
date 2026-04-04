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

  return (
    <div className="flex flex-col h-full overflow-hidden cq-gap">
      {/* Tier 1 (always): CPU % — the single most important metric */}
      {/* At tiny sizes, show all 3 as just icon + number horizontally */}
      <div className="@min-h-[90px]:hidden flex items-center justify-around h-full">
        {[
          { icon: Cpu, pct: data.cpu_percent, color: 'text-primary' },
          { icon: Server, pct: data.memory_percent, color: 'text-cyan-400' },
          { icon: HardDrive, pct: data.disk_percent, color: 'text-yellow-400' },
        ].map(({ icon: I, pct, color }) => (
          <div key={color} className="flex flex-col items-center">
            <I className={`w-3 h-3 ${color}`} />
            <span className="cq-text-lg font-bold">{pct.toFixed(0)}%</span>
          </div>
        ))}
      </div>

      {/* Tier 2 (>=90px height): vertical bars for CPU, RAM, Disk */}
      <div className="hidden @min-h-[90px]:flex flex-col justify-center cq-gap flex-1 min-h-0">
        {/* Hostname row — tier 3 (>=120px height) */}
        <div className="hidden @min-h-[120px]:flex items-center justify-between shrink-0">
          <span className="cq-text-sm font-medium truncate">{data.hostname}</span>
          <span className="cq-text-xs text-muted-foreground flex items-center gap-0.5"><Clock className="w-3 h-3"/>{fmtUp(data.uptime_secs)}</span>
        </div>

        {/* Core 3 bars */}
        {[
          { icon: Cpu, label: 'CPU', pct: data.cpu_percent, detail: `${data.cpu_count} cores`, color: 'text-primary' },
          { icon: Server, label: 'RAM', pct: data.memory_percent, detail: `${fmtB(data.memory_used_bytes)}/${fmtB(data.memory_total_bytes)}`, color: 'text-cyan-400' },
          { icon: HardDrive, label: 'Disk', pct: data.disk_percent, detail: `${fmtB(data.disk_used_bytes)}/${fmtB(data.disk_total_bytes)}`, color: 'text-yellow-400' },
        ].map(({ icon: I, label, pct, detail, color }) => (
          <div key={label}>
            <div className="flex items-center gap-1">
              <I className={`w-3 h-3 ${color} shrink-0`} />
              <span className="hidden @[130px]:inline cq-text-xs text-muted-foreground w-7 shrink-0">{label}</span>
              <Bar pct={pct} />
              <span className="cq-text-sm font-bold w-7 text-right shrink-0">{pct.toFixed(0)}%</span>
            </div>
            {/* Tier 4 (>=180px width): byte details */}
            <div className="hidden @[180px]:block cq-text-xs text-muted-foreground text-right">{detail}</div>
          </div>
        ))}

        {/* Tier 5 (>=220px width): Swap */}
        {data.swap_total_bytes > 0 && (
          <div className="hidden @[220px]:block">
            <div className="flex items-center gap-1">
              <Layers className="w-3 h-3 text-purple-400 shrink-0"/>
              <span className="cq-text-xs text-muted-foreground w-7 shrink-0">Swap</span>
              <Bar pct={data.swap_percent} />
              <span className="cq-text-sm font-bold w-7 text-right shrink-0">{data.swap_percent.toFixed(0)}%</span>
            </div>
            <div className="cq-text-xs text-muted-foreground text-right">{fmtB(data.swap_used_bytes)}/{fmtB(data.swap_total_bytes)}</div>
          </div>
        )}
      </div>

      {/* Tier 6 (>=280px width AND >=180px height): extra stats */}
      <div className="hidden @[280px]:@min-h-[180px]:grid grid-cols-2 gap-x-3 gap-y-0.5 py-1 border-t border-border/40 shrink-0">
        <div className="flex items-center gap-1"><Activity className="w-3 h-3 text-green-400 shrink-0"/><span className="cq-text-xs text-muted-foreground">Procs</span><span className="cq-text-sm font-semibold ml-auto">{data.process_count}</span></div>
        <div className="flex items-center gap-1"><Cpu className="w-3 h-3 text-primary shrink-0"/><span className="cq-text-xs text-muted-foreground">Cores</span><span className="cq-text-sm font-semibold ml-auto">{data.cpu_count}</span></div>
        <div className="flex items-center gap-1"><Wifi className="w-3 h-3 text-blue-400 shrink-0"/><span className="cq-text-xs text-muted-foreground">RX</span><span className="cq-text-sm font-semibold ml-auto">{fmtB(data.network_rx_bytes)}</span></div>
        <div className="flex items-center gap-1"><Wifi className="w-3 h-3 text-orange-400 shrink-0"/><span className="cq-text-xs text-muted-foreground">TX</span><span className="cq-text-sm font-semibold ml-auto">{fmtB(data.network_tx_bytes)}</span></div>
      </div>

      {/* Tier 7 (>=350px width): OS info */}
      <div className="hidden @[350px]:block cq-text-xs text-muted-foreground truncate border-t border-border/40 pt-0.5 shrink-0">{data.os}{data.kernel ? ` (${data.kernel})` : ''}</div>
    </div>
  );
}
