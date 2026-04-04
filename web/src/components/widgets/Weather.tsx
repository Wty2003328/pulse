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

function fmtDay(d: string): string { try{const dt=new Date(d+'T00:00:00'),t=new Date();t.setHours(0,0,0,0);const diff=(dt.getTime()-t.getTime())/864e5;if(diff<1)return'Today';if(diff<2)return'Tmrw';return dt.toLocaleDateString('en-US',{weekday:'short'});}catch{return d;} }

function S({icon:I,label,value,color}:{icon:React.ElementType;label:string;value:string;color:string}) {
  return <div className="flex items-center gap-1.5 min-w-0"><I className={`w-3.5 h-3.5 ${color} shrink-0`}/><div className="min-w-0"><div className="text-[0.6rem] text-muted-foreground leading-none">{label}</div><div className="text-xs font-semibold leading-tight truncate">{value}</div></div></div>;
}

interface Props { dims?: WidgetDimensions }

/**
 * Weather uses CSS @container queries for adaptive layout.
 * All sections rendered, CSS shows/hides based on container width:
 *   < 130px: temp + description only
 *   130-250px: + key stats (humidity, wind, UV)
 *   250-400px: + pressure, clouds, visibility, sunrise/sunset
 *   400px+: + hourly strip, full forecast with details
 */
export default function Weather({ dims }: Props) {
  const { data, loading, error } = useWidgetData<FeedResponse>('/api/feed?source=weather&limit=1', 300000);

  if (loading) return <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">Loading...</div>;
  if (error) return <div className="flex-1 flex items-center justify-center text-destructive text-sm">Error</div>;
  if (!data || data.items.length === 0) return <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">No data</div>;

  const m = data.items[0].metadata as unknown as WMeta;
  const mph = m.wind_speed_mph ?? (m.wind_speed_kmph != null ? Math.round(m.wind_speed_kmph * 0.621) : null);
  const uvL = m.uv_index != null ? (m.uv_index <= 2 ? 'Low' : m.uv_index <= 5 ? 'Mod' : m.uv_index <= 7 ? 'High' : 'V.High') : '';
  const fc = m.forecast || [];
  const todayHourly = fc[0]?.hourly || [];

  return (
    <div className="flex flex-col h-full overflow-hidden gap-1">
      {/* Header: temp + description — always visible */}
      <div className="flex items-start justify-between shrink-0">
        <div>
          <div className="flex items-baseline gap-0.5">
            <span className="text-3xl @[200px]:text-4xl font-bold">{Math.round(m.temp_f)}°</span>
            <span className="hidden @[150px]:inline text-sm text-muted-foreground">F</span>
          </div>
          {/* Feels like — visible at >=150px */}
          {m.feels_like_f != null && (
            <div className="hidden @[150px]:block text-xs text-muted-foreground mt-0.5">
              <Thermometer className="w-3 h-3 inline mr-0.5"/>Feels {Math.round(m.feels_like_f)}°
            </div>
          )}
        </div>
        <div className="text-right">
          {m.location && <div className="hidden @[130px]:flex text-xs text-muted-foreground items-center justify-end gap-0.5"><MapPin className="w-3 h-3"/>{m.location}</div>}
          <div className="text-xs @[150px]:text-sm font-medium">{m.description}</div>
          <div className="hidden @[250px]:block text-xs text-muted-foreground">{Math.round(m.temp_c)}°C</div>
        </div>
      </div>

      {/* Key stats — visible at >=130px width */}
      <div className="hidden @[130px]:grid grid-cols-2 @[300px]:grid-cols-3 gap-x-3 gap-y-1 py-1 border-y border-border/40 shrink-0">
        {m.humidity != null && <S icon={Droplets} label="Humidity" value={`${m.humidity}%`} color="text-blue-400"/>}
        {mph != null && <S icon={Wind} label="Wind" value={`${mph}mph ${m.wind_direction||''}`} color="text-cyan-400"/>}
        {m.uv_index != null && <S icon={Sun} label="UV" value={`${m.uv_index} ${uvL}`} color="text-yellow-400"/>}
        {/* Extra stats visible at >=250px */}
        {m.pressure_mb && <div className="hidden @[250px]:flex"><S icon={Gauge} label="Pressure" value={`${m.pressure_mb}mb`} color="text-purple-400"/></div>}
        {m.cloud_cover && <div className="hidden @[250px]:flex"><S icon={Cloud} label="Clouds" value={`${m.cloud_cover}%`} color="text-gray-400"/></div>}
        {m.visibility_km && <div className="hidden @[250px]:flex"><S icon={Eye} label="Visibility" value={`${m.visibility_km}km`} color="text-emerald-400"/></div>}
      </div>

      {/* Sunrise/sunset — visible at >=250px */}
      {fc[0]?.sunrise && (
        <div className="hidden @[250px]:flex items-center gap-3 text-xs text-muted-foreground shrink-0">
          <span className="flex items-center gap-1"><Sunrise className="w-3.5 h-3.5 text-orange-300"/>{fc[0].sunrise}</span>
          <span className="flex items-center gap-1"><Sunset className="w-3.5 h-3.5 text-red-300"/>{fc[0].sunset}</span>
          {fc[0].moon_phase && <span className="flex items-center gap-1 ml-auto"><Moon className="w-3.5 h-3.5 text-blue-200"/>{fc[0].moon_phase}</span>}
        </div>
      )}

      {/* Hourly — visible at >=350px */}
      {todayHourly.length > 0 && (
        <div className="hidden @[350px]:block shrink-0">
          <div className="text-xs font-semibold text-muted-foreground mb-0.5">Hourly</div>
          <div className="flex gap-1 overflow-x-auto pb-0.5">
            {todayHourly.map((h, i) => (
              <div key={i} className="flex flex-col items-center shrink-0 px-1.5 py-0.5 bg-muted rounded text-xs min-w-[2.5rem]">
                <span className="text-muted-foreground text-[0.6rem]">{h.time}</span>
                <span className="font-semibold">{h.temp_f}°</span>
                {parseInt(h.rain_chance) > 0 && <span className="text-blue-400 text-[0.6rem]">{h.rain_chance}%</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Forecast — visible at >=130px, details at >=300px */}
      {fc.length > 0 && (
        <div className="hidden @[130px]:flex flex-col flex-1 overflow-y-auto">
          <div className="text-xs font-semibold text-muted-foreground mb-0.5">Forecast</div>
          <div className="flex flex-col gap-0.5">
            {fc.map((day, i) => {
              const rain = day.rain_chance ? parseInt(day.rain_chance) : 0;
              return (
                <div key={i} className="flex items-center gap-1.5 p-1 bg-muted rounded text-xs">
                  <span className="font-semibold text-muted-foreground w-9 shrink-0">{fmtDay(day.date)}</span>
                  <span className="hidden @[300px]:block flex-1 text-foreground/70 truncate">{day.description}</span>
                  {rain > 0 && <span className="hidden @[200px]:flex items-center gap-0.5 text-blue-400 shrink-0"><CloudRain className="w-3 h-3"/>{rain}%</span>}
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
