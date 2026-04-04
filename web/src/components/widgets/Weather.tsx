import { useWidgetData } from '../../hooks/useWidgetData';
import { Droplets, Wind, Eye, Sun, Thermometer, MapPin, CloudRain, Gauge } from 'lucide-react';
import type { WidgetDimensions } from '../../lib/widget-size';
import type { FeedResponse } from '../../types';

interface WeatherMetadata {
  location?: string;
  temp_f: number; temp_c: number; description: string;
  feels_like_f?: number; feels_like_c?: number;
  humidity?: number; wind_speed_kmph?: number; wind_direction?: string;
  visibility?: string; uv_index?: number;
  forecast?: Array<{ date: string; high_f: string; low_f: string; high_c: string; low_c: string; description?: string; rain_chance?: string }>;
}

function formatDay(dateStr: string): string {
  try {
    const d = new Date(dateStr + 'T00:00:00');
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const diff = (d.getTime() - today.getTime()) / 86400000;
    if (diff < 1) return 'Today'; if (diff < 2) return 'Tmrw';
    return d.toLocaleDateString('en-US', { weekday: 'short' });
  } catch { return dateStr; }
}

function Stat({ icon: Icon, label, value, color }: { icon: React.ElementType; label: string; value: string; color: string }) {
  return (
    <div className="flex items-center gap-2 min-w-0">
      <Icon className={`w-4 h-4 ${color} shrink-0`} />
      <div className="min-w-0">
        <div className="text-[0.65rem] text-muted-foreground leading-none">{label}</div>
        <div className="text-sm font-semibold leading-tight truncate">{value}</div>
      </div>
    </div>
  );
}

interface Props { dims?: WidgetDimensions }

export default function Weather({ dims }: Props) {
  const { data, loading, error } = useWidgetData<FeedResponse>('/api/feed?source=weather&limit=1', 300000);
  const size = dims?.size ?? 'medium';

  if (loading) return <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">Loading...</div>;
  if (error) return <div className="flex-1 flex items-center justify-center text-destructive text-sm">Error</div>;
  if (!data || data.items.length === 0) return <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">No weather data</div>;

  const m = data.items[0].metadata as unknown as WeatherMetadata;
  const windMph = m.wind_speed_kmph != null ? Math.round(m.wind_speed_kmph * 0.621) : null;
  const uvLabel = m.uv_index != null ? (m.uv_index <= 2 ? 'Low' : m.uv_index <= 5 ? 'Moderate' : m.uv_index <= 7 ? 'High' : 'Very High') : '';

  /* Small: big temp + stats row */
  if (size === 'small') {
    return (
      <div className="flex flex-col h-full justify-center gap-1.5">
        <div className="flex items-center justify-between">
          <span className="text-4xl font-bold">{Math.round(m.temp_f)}°</span>
          <div className="text-right">
            {m.location && <div className="text-xs text-muted-foreground">{m.location}</div>}
            <div className="text-sm text-foreground">{m.description}</div>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-1 text-center">
          {m.humidity != null && <div><div className="text-xs text-muted-foreground">Humid</div><div className="text-sm font-bold">{m.humidity}%</div></div>}
          {windMph != null && <div><div className="text-xs text-muted-foreground">Wind</div><div className="text-sm font-bold">{windMph}</div></div>}
          {m.uv_index != null && <div><div className="text-xs text-muted-foreground">UV</div><div className="text-sm font-bold">{m.uv_index}</div></div>}
        </div>
      </div>
    );
  }

  /* Medium */
  if (size === 'medium') {
    return (
      <div className="flex flex-col h-full overflow-hidden gap-2">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-baseline gap-1"><span className="text-4xl font-bold">{Math.round(m.temp_f)}°</span><span className="text-sm text-muted-foreground">F</span></div>
            {m.feels_like_f != null && <div className="text-xs text-muted-foreground mt-0.5"><Thermometer className="w-3.5 h-3.5 inline mr-0.5" />Feels {Math.round(m.feels_like_f)}°</div>}
          </div>
          <div className="text-right">
            {m.location && <div className="text-xs text-muted-foreground flex items-center justify-end gap-0.5"><MapPin className="w-3.5 h-3.5" />{m.location}</div>}
            <div className="text-sm font-medium">{m.description}</div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 py-2 border-y border-border/40">
          {m.humidity != null && <Stat icon={Droplets} label="Humidity" value={`${m.humidity}%`} color="text-blue-400" />}
          {windMph != null && <Stat icon={Wind} label="Wind" value={`${windMph} mph ${m.wind_direction || ''}`} color="text-cyan-400" />}
          {m.visibility != null && <Stat icon={Eye} label="Visibility" value={`${m.visibility} km`} color="text-gray-400" />}
          {m.uv_index != null && <Stat icon={Sun} label="UV Index" value={`${m.uv_index} ${uvLabel}`} color="text-yellow-400" />}
        </div>
        {m.forecast && m.forecast.length > 0 && (
          <div className="flex-1 overflow-y-auto">
            <div className="flex flex-col gap-0.5">
              {m.forecast.map((day, i) => {
                const rain = day.rain_chance ? parseInt(day.rain_chance) : 0;
                return (
                  <div key={i} className="flex items-center gap-2 p-1.5 bg-muted rounded text-xs">
                    <span className="font-semibold text-muted-foreground w-10 shrink-0">{formatDay(day.date)}</span>
                    <span className="flex-1 text-foreground/70 truncate text-xs">{day.description}</span>
                    {rain > 0 && <span className="flex items-center gap-0.5 text-blue-400 shrink-0"><CloudRain className="w-3 h-3" />{rain}%</span>}
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

  /* Large: all stats + visual temp bar + full forecast */
  return (
    <div className="flex flex-col h-full overflow-hidden gap-2">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-baseline gap-1"><span className="text-5xl font-bold">{Math.round(m.temp_f)}°</span><span className="text-base text-muted-foreground">F</span></div>
          {m.feels_like_f != null && <div className="text-sm text-muted-foreground mt-1"><Thermometer className="w-4 h-4 inline mr-1" />Feels like {Math.round(m.feels_like_f)}°F / {Math.round(m.feels_like_c ?? 0)}°C</div>}
        </div>
        <div className="text-right">
          {m.location && <div className="text-sm text-muted-foreground flex items-center justify-end gap-1"><MapPin className="w-4 h-4" />{m.location}</div>}
          <div className="text-base font-medium mt-0.5">{m.description}</div>
          <div className="text-xs text-muted-foreground">{Math.round(m.temp_c)}°C</div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-x-4 gap-y-2 py-2 border-y border-border/40">
        {m.humidity != null && <Stat icon={Droplets} label="Humidity" value={`${m.humidity}%`} color="text-blue-400" />}
        {windMph != null && <Stat icon={Wind} label="Wind" value={`${windMph} mph ${m.wind_direction || ''}`} color="text-cyan-400" />}
        {m.visibility != null && <Stat icon={Eye} label="Visibility" value={`${m.visibility} km`} color="text-gray-400" />}
        {m.uv_index != null && <Stat icon={Sun} label="UV Index" value={`${m.uv_index} ${uvLabel}`} color="text-yellow-400" />}
        {m.feels_like_f != null && <Stat icon={Thermometer} label="Feels Like" value={`${Math.round(m.feels_like_f)}°F`} color="text-orange-400" />}
        {m.temp_c != null && <Stat icon={Gauge} label="Celsius" value={`${Math.round(m.temp_c)}°C`} color="text-teal-400" />}
      </div>

      {m.forecast && m.forecast.length > 0 && (
        <div className="flex-1 overflow-y-auto">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Forecast</div>
          <div className="flex flex-col gap-1">
            {m.forecast.map((day, i) => {
              const rain = day.rain_chance ? parseInt(day.rain_chance) : 0;
              const high = parseInt(day.high_f) || 0;
              const low = parseInt(day.low_f) || 0;
              const range = high - low || 1;
              return (
                <div key={i} className="p-2 bg-muted rounded-lg">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-sm">{formatDay(day.date)}</span>
                    <div className="flex items-center gap-3">
                      {rain > 0 && <span className="flex items-center gap-0.5 text-blue-400 text-xs"><CloudRain className="w-3.5 h-3.5" />{rain}%</span>}
                      <span className="text-destructive font-bold text-sm">{day.high_f}°</span>
                      <span className="text-muted-foreground text-sm">{day.low_f}°</span>
                    </div>
                  </div>
                  {day.description && <div className="text-xs text-muted-foreground mb-1">{day.description}</div>}
                  {/* Temperature range bar */}
                  <div className="h-2 bg-border/40 rounded-full overflow-hidden">
                    <div className="h-full rounded-full bg-gradient-to-r from-blue-400 via-yellow-400 to-red-400" style={{ width: `${Math.min(100, (range / 50) * 100)}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
