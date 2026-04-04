import { useWidgetData } from '../../hooks/useWidgetData';
import { Droplets, Wind, Eye, Sun, Thermometer, MapPin, CloudRain, Cloud, Gauge, Sunrise, Sunset, Moon } from 'lucide-react';
import type { WidgetDimensions } from '../../lib/widget-size';
import type { FeedResponse } from '../../types';

interface Hourly { time: string; temp_f?: string; rain_chance: string }
interface Forecast { date: string; high_f: string; low_f: string; description?: string; rain_chance?: string; sunrise?: string; sunset?: string; moon_phase?: string; hourly?: Hourly[] }
interface WMeta {
  location?: string; temp_f: number; temp_c: number; description: string;
  feels_like_f?: number; humidity?: number; wind_speed_mph?: number; wind_speed_kmph?: number;
  wind_direction?: string; visibility_km?: string; uv_index?: number;
  pressure_mb?: string; cloud_cover?: string; forecast?: Forecast[];
}

function fmtDay(d: string) { try{const dt=new Date(d+'T00:00:00'),t=new Date();t.setHours(0,0,0,0);const diff=(dt.getTime()-t.getTime())/864e5;if(diff<1)return'Today';if(diff<2)return'Tmrw';return dt.toLocaleDateString('en-US',{weekday:'short'});}catch{return d;} }

interface Props { dims?: WidgetDimensions }

export default function Weather({ dims }: Props) {
  const { data, loading, error } = useWidgetData<FeedResponse>('/api/feed?source=weather&limit=1', 300000);

  if (loading) return <div className="flex-1 flex items-center justify-center text-muted-foreground cq-text-sm">Loading...</div>;
  if (error) return <div className="flex-1 flex items-center justify-center text-destructive cq-text-sm">Error</div>;
  if (!data || data.items.length === 0) return <div className="flex-1 flex items-center justify-center text-muted-foreground cq-text-sm">No data</div>;

  const m = data.items[0].metadata as unknown as WMeta;
  const mph = m.wind_speed_mph ?? (m.wind_speed_kmph != null ? Math.round(m.wind_speed_kmph * 0.621) : null);
  const fc = m.forecast || [];
  const todayHourly = fc[0]?.hourly || [];

  return (
    <div className="flex flex-col h-full overflow-hidden gap-1.5">
      {/* Temp + description — always */}
      <div className="flex items-center justify-between shrink-0">
        <span className="cq-text-4xl font-bold leading-none">{Math.round(m.temp_f)}°</span>
        <div className="text-right min-w-0 ml-2">
          <div className="cq-text-base font-medium truncate">{m.description}</div>
          <div className="hidden @[160px]:block cq-text-xs text-muted-foreground truncate">{m.location}</div>
        </div>
      </div>

      {/* Core stats — always shown (3 stats) */}
      <div className="grid grid-cols-3 gap-x-2 gap-y-1 shrink-0">
        {m.humidity != null && <div className="flex items-center gap-1"><Droplets className="w-4 h-4 text-blue-400 shrink-0"/><div><div className="cq-text-xs text-muted-foreground">Humid</div><div className="cq-text-sm font-bold">{m.humidity}%</div></div></div>}
        {mph != null && <div className="flex items-center gap-1"><Wind className="w-4 h-4 text-cyan-400 shrink-0"/><div><div className="cq-text-xs text-muted-foreground">Wind</div><div className="cq-text-sm font-bold">{mph}mph</div></div></div>}
        {m.feels_like_f != null && <div className="flex items-center gap-1"><Thermometer className="w-4 h-4 text-orange-400 shrink-0"/><div><div className="cq-text-xs text-muted-foreground">Feels</div><div className="cq-text-sm font-bold">{Math.round(m.feels_like_f)}°</div></div></div>}
      </div>

      {/* Extra stats — at h>=140px (2x2+) */}
      <div className="hidden cqh-140-grid grid-cols-3 gap-x-2 gap-y-1 shrink-0 border-t border-border/30 pt-1">
        {m.uv_index != null && <div className="flex items-center gap-1"><Sun className="w-4 h-4 text-yellow-400 shrink-0"/><div><div className="cq-text-xs text-muted-foreground">UV</div><div className="cq-text-sm font-bold">{m.uv_index}</div></div></div>}
        {m.pressure_mb && <div className="flex items-center gap-1"><Gauge className="w-4 h-4 text-purple-400 shrink-0"/><div><div className="cq-text-xs text-muted-foreground">Press</div><div className="cq-text-sm font-bold">{m.pressure_mb}mb</div></div></div>}
        {m.cloud_cover && <div className="flex items-center gap-1"><Cloud className="w-4 h-4 text-gray-400 shrink-0"/><div><div className="cq-text-xs text-muted-foreground">Cloud</div><div className="cq-text-sm font-bold">{m.cloud_cover}%</div></div></div>}
        {m.visibility_km && <div className="hidden @[250px]:flex items-center gap-1"><Eye className="w-4 h-4 text-emerald-400 shrink-0"/><div><div className="cq-text-xs text-muted-foreground">Vis</div><div className="cq-text-sm font-bold">{m.visibility_km}km</div></div></div>}
      </div>

      {/* Sunrise/sunset — at h>=180px */}
      {fc[0]?.sunrise && (
        <div className="hidden cqh-180 items-center gap-2 cq-text-xs text-muted-foreground shrink-0 py-0.5">
          <Sunrise className="w-3.5 h-3.5 text-orange-300 shrink-0"/><span>{fc[0].sunrise}</span>
          <Sunset className="w-3.5 h-3.5 text-red-300 shrink-0 ml-1"/><span>{fc[0].sunset}</span>
          {fc[0].moon_phase && <span className="hidden @[280px]:flex items-center gap-0.5 ml-auto"><Moon className="w-3.5 h-3.5 text-blue-200"/>{fc[0].moon_phase}</span>}
        </div>
      )}

      {/* Hourly — at w>=300px and h>=200px */}
      {todayHourly.length > 0 && (
        <div className="hidden cqwh-300-200-block shrink-0">
          <div className="flex gap-0.5 overflow-x-auto pb-0.5">
            {todayHourly.map((h, i) => (
              <div key={i} className="flex flex-col items-center shrink-0 px-1 py-0.5 bg-muted rounded min-w-[2rem]">
                <span className="text-muted-foreground" style={{fontSize:'0.5rem'}}>{h.time}</span>
                <span className="cq-text-xs font-bold">{h.temp_f}°</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Forecast — at h>=140px */}
      {fc.length > 0 && (
        <div className="hidden cqh-140 flex-col flex-1 overflow-y-auto min-h-0">
          <div className="cq-text-xs font-semibold text-muted-foreground mb-0.5">Forecast</div>
          <div className="flex flex-col flex-1 gap-1">
          {fc.map((day, i) => {
            const rain = day.rain_chance ? parseInt(day.rain_chance) : 0;
            return (
              <div key={i} className="flex items-center gap-2 p-2 bg-muted rounded-lg cq-text-sm flex-1">
                <span className="font-semibold text-muted-foreground w-8 shrink-0">{fmtDay(day.date)}</span>
                <span className="hidden @[220px]:block flex-1 text-foreground/60 truncate">{day.description}</span>
                {rain > 0 && <span className="hidden @[140px]:flex items-center gap-0.5 text-blue-400 shrink-0"><CloudRain className="w-2.5 h-2.5"/>{rain}%</span>}
                <span className="text-destructive/80 font-bold shrink-0">{day.high_f}°</span>
                <span className="text-muted-foreground shrink-0">{day.low_f}°</span>
              </div>
            );
          })}
          </div>
        </div>
      )}
    </div>
  );
}
