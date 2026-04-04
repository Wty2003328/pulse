import { useWidgetData } from '../../hooks/useWidgetData';
import { Droplets, Wind, Eye, Sun, Thermometer, MapPin, CloudRain, Cloud, Gauge, Sunrise, Sunset, Moon } from 'lucide-react';
import type { WidgetDimensions } from '../../lib/widget-size';
import type { FeedResponse } from '../../types';

interface Hourly { time: string; temp_f?: string; temp_c?: string; description: string; rain_chance: string; humidity?: string; wind_kmph?: string; cloud_cover?: string }
interface Forecast { date: string; high_f: string; low_f: string; high_c: string; low_c: string; description?: string; rain_chance?: string; uv_index?: string; sun_hours?: string; sunrise?: string; sunset?: string; moon_phase?: string; hourly?: Hourly[] }
interface WMeta {
  location?: string; region?: string; temp_f: number; temp_c: number; description: string;
  feels_like_f?: number; feels_like_c?: number; humidity?: number;
  wind_speed_kmph?: number; wind_speed_mph?: number; wind_direction?: string;
  visibility_km?: string; visibility_miles?: string; uv_index?: number;
  pressure_mb?: string; pressure_in?: string; cloud_cover?: string;
  precip_mm?: string; precip_in?: string; forecast?: Forecast[];
}

function fmtDay(d: string): string { try { const dt=new Date(d+'T00:00:00'),t=new Date();t.setHours(0,0,0,0);const diff=(dt.getTime()-t.getTime())/864e5;if(diff<1)return'Today';if(diff<2)return'Tmrw';return dt.toLocaleDateString('en-US',{weekday:'short'}); } catch{return d;} }

function S({ icon:I,label,value,color }:{icon:React.ElementType;label:string;value:string;color:string}) {
  return <div className="flex items-center gap-1.5 min-w-0"><I className={`w-3.5 h-3.5 ${color} shrink-0`}/><div className="min-w-0"><div className="text-[0.6rem] text-muted-foreground leading-none">{label}</div><div className="text-xs font-semibold leading-tight truncate">{value}</div></div></div>;
}

interface Props { dims?: WidgetDimensions }

export default function Weather({ dims }: Props) {
  const { data, loading, error } = useWidgetData<FeedResponse>('/api/feed?source=weather&limit=1', 300000);
  const size = dims?.size ?? 'large';
  const ori = dims?.orientation ?? 'square';

  if (loading) return <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">Loading...</div>;
  if (error) return <div className="flex-1 flex items-center justify-center text-destructive text-sm">Error</div>;
  if (!data || data.items.length === 0) return <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">No data</div>;

  const m = data.items[0].metadata as unknown as WMeta;
  const mph = m.wind_speed_mph ?? (m.wind_speed_kmph != null ? Math.round(m.wind_speed_kmph * 0.621) : null);

  /* ── Small: temp + key stats ── */
  if (size === 'small') {
    return (
      <div className="flex flex-col h-full items-center justify-center gap-0.5">
        <span className="text-3xl font-bold">{Math.round(m.temp_f)}°</span>
        <span className="text-xs text-muted-foreground">{m.description}</span>
        <div className="flex gap-2 text-xs text-muted-foreground mt-0.5">
          <span>{m.humidity}%</span>
          {mph != null && <span>{mph}mph</span>}
        </div>
      </div>
    );
  }

  /* ── Medium ── */
  if (size === 'medium') {
    const stats: [React.ElementType,string,string,string][] = [];
    if (m.feels_like_f != null) stats.push([Thermometer,'Feels',`${Math.round(m.feels_like_f)}°`,'text-orange-400']);
    if (m.humidity != null) stats.push([Droplets,'Humid',`${m.humidity}%`,'text-blue-400']);
    if (mph != null) stats.push([Wind,'Wind',`${mph}mph ${m.wind_direction||''}`,'text-cyan-400']);
    if (m.uv_index != null) stats.push([Sun,'UV',`${m.uv_index}`,'text-yellow-400']);
    if (m.pressure_mb) stats.push([Gauge,'Press',`${m.pressure_mb}mb`,'text-purple-400']);
    if (m.cloud_cover) stats.push([Cloud,'Cloud',`${m.cloud_cover}%`,'text-gray-400']);

    if (ori === 'wide') {
      return (
        <div className="flex h-full items-center gap-3">
          <div className="text-center shrink-0">
            <div className="text-4xl font-bold">{Math.round(m.temp_f)}°</div>
            <div className="text-xs text-muted-foreground">{m.description}</div>
            {m.location && <div className="text-xs text-muted-foreground">{m.location}</div>}
          </div>
          <div className="border-l border-border/50 pl-3 grid grid-cols-2 gap-x-3 gap-y-1 flex-1">
            {stats.map(([I,l,v,c],i)=><S key={i} icon={I} label={l} value={v} color={c}/>)}
          </div>
        </div>
      );
    }
    return (
      <div className="flex flex-col h-full gap-1.5">
        <div className="flex items-center justify-between">
          <span className="text-4xl font-bold">{Math.round(m.temp_f)}°</span>
          <div className="text-right"><div className="text-sm">{m.description}</div>{m.location && <div className="text-xs text-muted-foreground">{m.location}</div>}</div>
        </div>
        <div className="grid grid-cols-2 gap-x-3 gap-y-1 mt-auto">
          {stats.map(([I,l,v,c],i)=><S key={i} icon={I} label={l} value={v} color={c}/>)}
        </div>
      </div>
    );
  }

  /* ── Large: everything + hourly + astronomy ── */
  const fc = m.forecast || [];
  const today = fc[0];
  const todayHourly = today?.hourly || [];

  return (
    <div className="flex flex-col h-full overflow-hidden gap-1.5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-baseline gap-1"><span className="text-4xl font-bold">{Math.round(m.temp_f)}°</span><span className="text-sm text-muted-foreground">F / {Math.round(m.temp_c)}°C</span></div>
          {m.feels_like_f != null && <div className="text-xs text-muted-foreground"><Thermometer className="w-3.5 h-3.5 inline mr-0.5"/>Feels {Math.round(m.feels_like_f)}°F</div>}
        </div>
        <div className="text-right">
          {m.location && <div className="text-xs text-muted-foreground flex items-center justify-end gap-0.5"><MapPin className="w-3.5 h-3.5"/>{m.location}{m.region ? `, ${m.region}` : ''}</div>}
          <div className="text-sm font-medium">{m.description}</div>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-3 gap-x-3 gap-y-1 py-1.5 border-y border-border/40">
        {m.humidity != null && <S icon={Droplets} label="Humidity" value={`${m.humidity}%`} color="text-blue-400"/>}
        {mph != null && <S icon={Wind} label="Wind" value={`${mph} mph ${m.wind_direction||''}`} color="text-cyan-400"/>}
        {m.uv_index != null && <S icon={Sun} label="UV" value={`${m.uv_index}`} color="text-yellow-400"/>}
        {m.pressure_mb && <S icon={Gauge} label="Pressure" value={`${m.pressure_mb} mb`} color="text-purple-400"/>}
        {m.cloud_cover && <S icon={Cloud} label="Clouds" value={`${m.cloud_cover}%`} color="text-gray-400"/>}
        {m.visibility_km && <S icon={Eye} label="Visibility" value={`${m.visibility_km} km`} color="text-emerald-400"/>}
      </div>

      {/* Sunrise/sunset if available */}
      {today?.sunrise && (
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1"><Sunrise className="w-3.5 h-3.5 text-orange-300"/>{today.sunrise}</span>
          <span className="flex items-center gap-1"><Sunset className="w-3.5 h-3.5 text-red-300"/>{today.sunset}</span>
          {today.moon_phase && <span className="flex items-center gap-1 ml-auto"><Moon className="w-3.5 h-3.5 text-blue-200"/>{today.moon_phase}</span>}
        </div>
      )}

      {/* Hourly temps (today) */}
      {todayHourly.length > 0 && (
        <div>
          <div className="text-xs font-semibold text-muted-foreground mb-1">Hourly</div>
          <div className="flex gap-1 overflow-x-auto pb-1">
            {todayHourly.map((h, i) => (
              <div key={i} className="flex flex-col items-center shrink-0 px-1.5 py-1 bg-muted rounded text-xs min-w-[3rem]">
                <span className="text-muted-foreground text-[0.6rem]">{h.time}</span>
                <span className="font-semibold">{h.temp_f}°</span>
                {parseInt(h.rain_chance) > 0 && <span className="text-blue-400 text-[0.6rem]">{h.rain_chance}%</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Forecast */}
      {fc.length > 0 && (
        <div className="flex-1 overflow-y-auto">
          <div className="text-xs font-semibold text-muted-foreground mb-0.5">Forecast</div>
          <div className="flex flex-col gap-0.5">
            {fc.map((day, i) => {
              const rain = day.rain_chance ? parseInt(day.rain_chance) : 0;
              return (
                <div key={i} className="flex items-center gap-2 p-1.5 bg-muted rounded text-xs">
                  <span className="font-semibold text-muted-foreground w-10 shrink-0">{fmtDay(day.date)}</span>
                  <span className="flex-1 text-foreground/70 truncate">{day.description}</span>
                  {rain > 0 && <span className="flex items-center gap-0.5 text-blue-400 shrink-0"><CloudRain className="w-3 h-3"/>{rain}%</span>}
                  {day.sunrise && <span className="text-muted-foreground shrink-0 hidden sm:inline">{day.sunrise}</span>}
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
