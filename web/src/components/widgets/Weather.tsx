import { useWidgetData } from '../../hooks/useWidgetData';
import type { WidgetDimensions } from '../../lib/widget-size';
import type { FeedResponse } from '../../types';

interface WeatherMetadata {
  temp_f: number;
  temp_c: number;
  description: string;
  feels_like_f?: number;
  feels_like_c?: number;
  humidity?: number;
  wind_mph?: number;
  wind_kph?: number;
  forecast?: Array<{ day: string; high_f: number; low_f: number; description: string }>;
}

interface Props { dims?: WidgetDimensions }

export default function Weather({ dims }: Props) {
  const { data, loading, error } = useWidgetData<FeedResponse>('/api/feed?source=weather&limit=10', 300000);
  const size = dims?.size ?? 'medium';

  if (loading) return <div className="flex-1 flex items-center justify-center text-muted-foreground text-xs">Loading weather...</div>;
  if (error) return <div className="flex-1 flex items-center justify-center text-destructive text-xs">Error: {error}</div>;
  if (!data || data.items.length === 0) {
    return <div className="flex-1 flex items-center justify-center text-muted-foreground text-xs">No weather data</div>;
  }

  const metadata = data.items[0].metadata as unknown as WeatherMetadata;
  const showForecast = size !== 'small';

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex items-center gap-3 mb-2">
        <div className="flex items-baseline gap-0.5">
          <span className="text-2xl font-bold text-foreground">{Math.round(metadata.temp_f)}°</span>
          <span className="text-xs text-muted-foreground font-medium">F</span>
        </div>
        <div className="flex-1">
          <div className="text-xs text-muted-foreground">{metadata.description}</div>
          {metadata.feels_like_f !== undefined && <div className="text-[0.65rem] text-muted-foreground">Feels {Math.round(metadata.feels_like_f)}°</div>}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 py-2 border-y border-border/50 mb-2">
        {metadata.humidity !== undefined && (
          <div className="flex flex-col">
            <span className="text-[0.6rem] text-muted-foreground uppercase tracking-wider">Humidity</span>
            <span className="text-xs font-semibold">{metadata.humidity}%</span>
          </div>
        )}
        {metadata.wind_mph !== undefined && (
          <div className="flex flex-col">
            <span className="text-[0.6rem] text-muted-foreground uppercase tracking-wider">Wind</span>
            <span className="text-xs font-semibold">{Math.round(metadata.wind_mph)} mph</span>
          </div>
        )}
      </div>

      {showForecast && metadata.forecast && metadata.forecast.length > 0 && (
        <div className="flex-1 overflow-y-auto">
          <div className="text-[0.6rem] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Forecast</div>
          <div className="flex flex-col gap-1">
            {metadata.forecast.slice(0, 5).map((day, idx) => (
              <div key={idx} className="grid grid-cols-[50px_1fr_1fr] items-center gap-1.5 p-1.5 bg-muted rounded text-[0.7rem]">
                <span className="font-semibold text-muted-foreground">{day.day}</span>
                <div className="flex gap-1.5 justify-center">
                  <span className="text-destructive font-semibold">{Math.round(day.high_f)}°</span>
                  <span className="text-muted-foreground">{Math.round(day.low_f)}°</span>
                </div>
                <span className="text-muted-foreground text-right truncate">{day.description}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
