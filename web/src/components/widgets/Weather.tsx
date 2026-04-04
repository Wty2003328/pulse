import { useWidgetData } from '../../hooks/useWidgetData';
import { Droplets, Wind, Eye, Sun, Thermometer, MapPin, CloudRain, Gauge } from 'lucide-react';
import type { WidgetDimensions } from '../../lib/widget-size';
import type { FeedResponse } from '../../types';

interface WeatherMetadata {
  location?: string;
  temp_f: number;
  temp_c: number;
  description: string;
  feels_like_f?: number;
  feels_like_c?: number;
  humidity?: number;
  wind_speed_kmph?: number;
  wind_direction?: string;
  visibility?: string;
  uv_index?: number;
  forecast?: Array<{
    date: string; high_f: string; low_f: string; high_c: string; low_c: string;
    description?: string; rain_chance?: string;
  }>;
}

function formatDay(dateStr: string): string {
  try {
    const d = new Date(dateStr + 'T00:00:00');
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const diff = (d.getTime() - today.getTime()) / 86400000;
    if (diff < 1) return 'Today';
    if (diff < 2) return 'Tmrw';
    return d.toLocaleDateString('en-US', { weekday: 'short' });
  } catch { return dateStr; }
}

function Stat({ icon: Icon, label, value, color }: { icon: React.ElementType; label: string; value: string; color: string }) {
  return (
    <div className="flex items-center gap-1.5 min-w-0">
      <Icon className={`w-3 h-3 ${color} shrink-0`} />
      <div className="min-w-0">
        <div className="text-[0.5rem] text-muted-foreground leading-none">{label}</div>
        <div className="text-[0.7rem] font-semibold leading-tight truncate">{value}</div>
      </div>
    </div>
  );
}

interface Props { dims?: WidgetDimensions }

export default function Weather({ dims }: Props) {
  const { data, loading, error } = useWidgetData<FeedResponse>('/api/feed?source=weather&limit=1', 300000);
  const size = dims?.size ?? 'medium';

  if (loading) return <div className="flex-1 flex items-center justify-center text-muted-foreground text-xs">Loading...</div>;
  if (error) return <div className="flex-1 flex items-center justify-center text-destructive text-xs">Error</div>;
  if (!data || data.items.length === 0) return <div className="flex-1 flex items-center justify-center text-muted-foreground text-xs">No weather data</div>;

  const m = data.items[0].metadata as unknown as WeatherMetadata;
  const windMph = m.wind_speed_kmph != null ? Math.round(m.wind_speed_kmph * 0.621) : null;
  const uvLabel = m.uv_index != null ? (m.uv_index <= 2 ? 'Low' : m.uv_index <= 5 ? 'Mod' : m.uv_index <= 7 ? 'High' : 'V.High') : '';

  /* ── Small: compact 2-row grid ── */
  if (size === 'small') {
    return (
      <div className="flex flex-col h-full gap-1">
        {/* Row 1: Temp + location */}
        <div className="flex items-center justify-between">
          <div className="flex items-baseline gap-0.5">
            <span className="text-2xl font-bold">{Math.round(m.temp_f)}°</span>
            <span className="text-[0.6rem] text-muted-foreground">F</span>
          </div>
          <div className="text-right">
            {m.location && <div className="text-[0.55rem] text-muted-foreground flex items-center justify-end gap-0.5"><MapPin className="w-2.5 h-2.5" />{m.location}</div>}
            <div className="text-[0.65rem] text-foreground">{m.description}</div>
          </div>
        </div>
        {/* Row 2: Key stats grid */}
        <div className="grid grid-cols-4 gap-1 mt-auto">
          {m.feels_like_f != null && <div className="text-center"><div className="text-[0.45rem] text-muted-foreground">Feels</div><div className="text-[0.65rem] font-semibold">{Math.round(m.feels_like_f)}°</div></div>}
          {m.humidity != null && <div className="text-center"><div className="text-[0.45rem] text-muted-foreground">Humid</div><div className="text-[0.65rem] font-semibold">{m.humidity}%</div></div>}
          {windMph != null && <div className="text-center"><div className="text-[0.45rem] text-muted-foreground">Wind</div><div className="text-[0.65rem] font-semibold">{windMph}<span className="text-[0.45rem]">mph</span></div></div>}
          {m.uv_index != null && <div className="text-center"><div className="text-[0.45rem] text-muted-foreground">UV</div><div className="text-[0.65rem] font-semibold">{m.uv_index}</div></div>}
        </div>
        {/* Row 3: Mini forecast if space */}
        {m.forecast && m.forecast.length > 0 && (dims?.h ?? 2) >= 3 && (
          <div className="flex gap-1 mt-1 justify-between">
            {m.forecast.slice(0, 3).map((d, i) => (
              <div key={i} className="text-center flex-1">
                <div className="text-[0.45rem] text-muted-foreground">{formatDay(d.date)}</div>
                <div className="text-[0.55rem]"><span className="text-destructive/70 font-semibold">{d.high_f}°</span> <span className="text-muted-foreground">{d.low_f}°</span></div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  /* ── Medium / Large ── */
  return (
    <div className="flex flex-col h-full overflow-hidden gap-1">
      {/* Header: Temp + location */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-baseline gap-0.5">
            <span className="text-3xl font-bold">{Math.round(m.temp_f)}°</span>
            <span className="text-xs text-muted-foreground">F</span>
          </div>
          {m.feels_like_f != null && <div className="text-[0.6rem] text-muted-foreground"><Thermometer className="w-3 h-3 inline mr-0.5" />Feels {Math.round(m.feels_like_f)}°</div>}
        </div>
        <div className="text-right">
          {m.location && <div className="text-[0.65rem] text-muted-foreground flex items-center justify-end gap-0.5"><MapPin className="w-3 h-3" />{m.location}</div>}
          <div className="text-xs font-medium">{m.description}</div>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-x-3 gap-y-1 py-1.5 border-y border-border/40">
        {m.humidity != null && <Stat icon={Droplets} label="Humidity" value={`${m.humidity}%`} color="text-blue-400" />}
        {windMph != null && <Stat icon={Wind} label="Wind" value={`${windMph} mph ${m.wind_direction || ''}`} color="text-cyan-400" />}
        {m.visibility != null && <Stat icon={Eye} label="Visibility" value={`${m.visibility} km`} color="text-gray-400" />}
        {m.uv_index != null && <Stat icon={Sun} label="UV Index" value={`${m.uv_index} ${uvLabel}`} color="text-yellow-400" />}
        {m.feels_like_f != null && <Stat icon={Thermometer} label="Feels Like" value={`${Math.round(m.feels_like_f)}°F`} color="text-orange-400" />}
        {m.temp_c != null && <Stat icon={Gauge} label="Temp (C)" value={`${Math.round(m.temp_c)}°C`} color="text-teal-400" />}
      </div>

      {/* Forecast */}
      {m.forecast && m.forecast.length > 0 && (
        <div className="flex-1 overflow-y-auto">
          <div className="text-[0.5rem] font-semibold uppercase tracking-wider text-muted-foreground mb-0.5">Forecast</div>
          <div className="flex flex-col gap-0.5">
            {m.forecast.map((day, i) => {
              const rain = day.rain_chance ? parseInt(day.rain_chance) : 0;
              return (
                <div key={i} className="flex items-center gap-1.5 p-1 bg-muted rounded text-[0.6rem]">
                  <span className="font-semibold text-muted-foreground w-8 shrink-0">{formatDay(day.date)}</span>
                  <span className="flex-1 text-foreground/70 truncate text-[0.55rem]">{day.description}</span>
                  {rain > 0 && <span className="flex items-center gap-0.5 text-blue-400 shrink-0 text-[0.55rem]"><CloudRain className="w-2.5 h-2.5" />{rain}%</span>}
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
