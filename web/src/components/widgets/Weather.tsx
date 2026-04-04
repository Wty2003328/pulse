import { useWidgetData } from '../../hooks/useWidgetData';
import { Droplets, Wind, Eye, Sun, Thermometer, MapPin, CloudRain, Cloud, Gauge, Sunrise, Sunset, Moon } from 'lucide-react';
import type { WidgetDimensions } from '../../lib/widget-size';
import type { FeedResponse } from '../../types';

interface Hourly { time: string; temp_f?: string; rain_chance: string }
interface Forecast { date: string; high_f: string; low_f: string; description?: string; rain_chance?: string; sunrise?: string; sunset?: string; moon_phase?: string; hourly?: Hourly[] }
interface WMeta {
  location?: string; region?: string; temp_f: number; temp_c: number; description: string;
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
  const uvL = m.uv_index != null ? (m.uv_index <= 2 ? 'Low' : m.uv_index <= 5 ? 'Mod' : m.uv_index <= 7 ? 'High' : 'V.High') : '';
  const fc = m.forecast || [];
  const todayHourly = fc[0]?.hourly || [];

  {/* Realistic breakpoints:
      1x1 = ~137x123  2x1 = ~297x123  1x2 = ~137x283
      2x2 = ~297x283  3x2 = ~458x283  3x3 = ~458x444 */}

  return (
    <div className="flex flex-col h-full overflow-hidden gap-1">
      {/* Row 1: Temp + description — always */}
      <div className="flex items-start justify-between shrink-0">
        <div className="flex items-baseline gap-0.5">
          <span className="cq-text-4xl font-bold leading-none">{Math.round(m.temp_f)}°</span>
          <span className="hidden @[120px]:inline cq-text-xs text-muted-foreground">F</span>
        </div>
        <div className="text-right min-w-0 flex-1 ml-1">
          <div className="cq-text-sm font-medium truncate">{m.description}</div>
          <div className="hidden @[200px]:block cq-text-xs text-muted-foreground truncate">{m.location}</div>
        </div>
      </div>

      {/* Row 2: Compact stats — at 1x1 (always, below temp) */}
      <div className="flex flex-wrap gap-x-2 gap-y-0.5 shrink-0">
        {m.humidity != null && <span className="flex items-center gap-0.5 cq-text-xs text-muted-foreground"><Droplets className="w-2.5 h-2.5 text-blue-400"/>{m.humidity}%</span>}
        {mph != null && <span className="flex items-center gap-0.5 cq-text-xs text-muted-foreground"><Wind className="w-2.5 h-2.5 text-cyan-400"/>{mph}mph</span>}
        {m.uv_index != null && <span className="hidden @[120px]:flex items-center gap-0.5 cq-text-xs text-muted-foreground"><Sun className="w-2.5 h-2.5 text-yellow-400"/>UV{m.uv_index}</span>}
        {m.feels_like_f != null && <span className="hidden @[200px]:flex items-center gap-0.5 cq-text-xs text-muted-foreground"><Thermometer className="w-2.5 h-2.5 text-orange-400"/>{Math.round(m.feels_like_f)}°</span>}
        {m.pressure_mb && <span className="hidden @[250px]:flex items-center gap-0.5 cq-text-xs text-muted-foreground"><Gauge className="w-2.5 h-2.5 text-purple-400"/>{m.pressure_mb}mb</span>}
        {m.cloud_cover && <span className="hidden @[250px]:flex items-center gap-0.5 cq-text-xs text-muted-foreground"><Cloud className="w-2.5 h-2.5 text-gray-400"/>{m.cloud_cover}%</span>}
        {m.visibility_km && <span className="hidden @[350px]:flex items-center gap-0.5 cq-text-xs text-muted-foreground"><Eye className="w-2.5 h-2.5 text-emerald-400"/>{m.visibility_km}km</span>}
      </div>

      {/* Sunrise/sunset — at 2×2+ (h>=200 and w>=200) */}
      {fc[0]?.sunrise && (
        <div className="hidden @[200px]:@min-h-[200px]:flex items-center gap-2 cq-text-xs text-muted-foreground shrink-0">
          <span className="flex items-center gap-0.5"><Sunrise className="w-3 h-3 text-orange-300"/>{fc[0].sunrise}</span>
          <span className="flex items-center gap-0.5"><Sunset className="w-3 h-3 text-red-300"/>{fc[0].sunset}</span>
          {fc[0].moon_phase && <span className="hidden @[300px]:flex items-center gap-0.5 ml-auto"><Moon className="w-3 h-3 text-blue-200"/>{fc[0].moon_phase}</span>}
        </div>
      )}

      {/* Hourly — at 3×2+ (w>=350) */}
      {todayHourly.length > 0 && (
        <div className="hidden @[350px]:block shrink-0">
          <div className="cq-text-xs font-semibold text-muted-foreground mb-0.5">Hourly</div>
          <div className="flex gap-0.5 overflow-x-auto pb-0.5">
            {todayHourly.map((h, i) => (
              <div key={i} className="flex flex-col items-center shrink-0 px-1 py-0.5 bg-muted rounded min-w-[2rem]">
                <span className="text-muted-foreground" style={{fontSize:'0.5rem'}}>{h.time}</span>
                <span className="cq-text-xs font-semibold">{h.temp_f}°</span>
                {parseInt(h.rain_chance) > 0 && <span className="text-blue-400" style={{fontSize:'0.5rem'}}>{h.rain_chance}%</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Forecast — at 1×2+ (h>=200) */}
      {fc.length > 0 && (
        <div className="hidden @min-h-[200px]:flex flex-col flex-1 overflow-y-auto min-h-0">
          <div className="cq-text-xs font-semibold text-muted-foreground mb-0.5">Forecast</div>
          <div className="flex flex-col gap-0.5">
            {fc.map((day, i) => {
              const rain = day.rain_chance ? parseInt(day.rain_chance) : 0;
              return (
                <div key={i} className="flex items-center gap-1 px-1 py-0.5 bg-muted rounded cq-text-xs">
                  <span className="font-semibold text-muted-foreground w-8 shrink-0">{fmtDay(day.date)}</span>
                  <span className="hidden @[250px]:block flex-1 text-foreground/70 truncate">{day.description}</span>
                  {rain > 0 && <span className="hidden @[160px]:flex items-center gap-0.5 text-blue-400 shrink-0"><CloudRain className="w-2.5 h-2.5"/>{rain}%</span>}
                  <span className="text-destructive/80 font-semibold shrink-0">{day.high_f}°</span>
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
