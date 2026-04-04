import { useWidgetData } from '../../hooks/useWidgetData';
import { Droplets, Wind, Eye, Sun, Thermometer, MapPin, CloudRain } from 'lucide-react';
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
    date: string;
    high_f: string;
    low_f: string;
    high_c: string;
    low_c: string;
    description?: string;
    rain_chance?: string;
  }>;
}

function formatDay(dateStr: string): string {
  try {
    const d = new Date(dateStr + 'T00:00:00');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diff = (d.getTime() - today.getTime()) / 86400000;
    if (diff < 1) return 'Today';
    if (diff < 2) return 'Tmrw';
    return d.toLocaleDateString('en-US', { weekday: 'short' });
  } catch { return dateStr; }
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

  // Small: centered temp + key stats
  if (size === 'small') {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-1">
        {m.location && <span className="text-[0.6rem] text-muted-foreground flex items-center gap-0.5"><MapPin className="w-2.5 h-2.5" />{m.location}</span>}
        <span className="text-3xl font-bold text-foreground">{Math.round(m.temp_f)}°</span>
        <span className="text-[0.7rem] text-muted-foreground">{m.description}</span>
        <div className="flex gap-3 text-[0.6rem] text-muted-foreground mt-1">
          {m.humidity != null && <span className="flex items-center gap-0.5"><Droplets className="w-2.5 h-2.5 text-blue-400" />{m.humidity}%</span>}
          {windMph != null && <span className="flex items-center gap-0.5"><Wind className="w-2.5 h-2.5 text-cyan-400" />{windMph}mph</span>}
          {m.uv_index != null && <span className="flex items-center gap-0.5"><Sun className="w-2.5 h-2.5 text-yellow-400" />{m.uv_index}</span>}
        </div>
      </div>
    );
  }

  // Medium/Large
  return (
    <div className="flex flex-col h-full overflow-hidden gap-1.5">
      {/* Current conditions */}
      <div className="flex items-start gap-3">
        <div>
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-bold text-foreground">{Math.round(m.temp_f)}°</span>
            <span className="text-xs text-muted-foreground">F</span>
          </div>
          {m.feels_like_f != null && (
            <div className="text-[0.65rem] text-muted-foreground mt-0.5">
              <Thermometer className="w-3 h-3 inline mr-0.5" />Feels {Math.round(m.feels_like_f)}°
            </div>
          )}
        </div>
        <div className="flex-1 text-right">
          {m.location && <div className="text-xs text-muted-foreground flex items-center justify-end gap-0.5"><MapPin className="w-3 h-3" />{m.location}</div>}
          <div className="text-xs text-foreground font-medium mt-0.5">{m.description}</div>
        </div>
      </div>

      {/* Detail grid */}
      <div className="grid grid-cols-2 gap-x-3 gap-y-1 py-1.5 border-y border-border/50">
        {m.humidity != null && (
          <div className="flex items-center gap-1.5">
            <Droplets className="w-3.5 h-3.5 text-blue-400 shrink-0" />
            <div><div className="text-[0.5rem] text-muted-foreground leading-tight">Humidity</div><div className="text-[0.7rem] font-semibold">{m.humidity}%</div></div>
          </div>
        )}
        {windMph != null && (
          <div className="flex items-center gap-1.5">
            <Wind className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <div><div className="text-[0.5rem] text-muted-foreground leading-tight">Wind</div><div className="text-[0.7rem] font-semibold">{windMph} mph {m.wind_direction || ''}</div></div>
          </div>
        )}
        {m.visibility != null && (
          <div className="flex items-center gap-1.5">
            <Eye className="w-3.5 h-3.5 text-gray-400 shrink-0" />
            <div><div className="text-[0.5rem] text-muted-foreground leading-tight">Visibility</div><div className="text-[0.7rem] font-semibold">{m.visibility} km</div></div>
          </div>
        )}
        {m.uv_index != null && (
          <div className="flex items-center gap-1.5">
            <Sun className="w-3.5 h-3.5 text-yellow-400 shrink-0" />
            <div><div className="text-[0.5rem] text-muted-foreground leading-tight">UV Index</div><div className="text-[0.7rem] font-semibold">{m.uv_index} <span className="text-muted-foreground font-normal text-[0.6rem]">{m.uv_index <= 2 ? 'Low' : m.uv_index <= 5 ? 'Mod' : m.uv_index <= 7 ? 'High' : 'V.High'}</span></div></div>
          </div>
        )}
      </div>

      {/* Forecast */}
      {m.forecast && m.forecast.length > 0 && (
        <div className="flex-1 overflow-y-auto">
          <div className="text-[0.5rem] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Forecast</div>
          <div className="flex flex-col gap-0.5">
            {m.forecast.map((day, i) => {
              const rain = day.rain_chance ? parseInt(day.rain_chance) : 0;
              return (
                <div key={i} className="flex items-center gap-2 p-1.5 bg-muted rounded text-[0.65rem]">
                  <span className="font-semibold text-muted-foreground w-9 shrink-0">{formatDay(day.date)}</span>
                  <div className="flex-1 min-w-0">
                    {day.description && <span className="text-foreground/70 truncate block text-[0.6rem]">{day.description}</span>}
                  </div>
                  {rain > 0 && (
                    <span className="flex items-center gap-0.5 text-blue-400 shrink-0">
                      <CloudRain className="w-3 h-3" />{rain}%
                    </span>
                  )}
                  <div className="flex gap-1.5 shrink-0">
                    <span className="text-destructive/80 font-semibold">{day.high_f}°</span>
                    <span className="text-muted-foreground">{day.low_f}°</span>
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
