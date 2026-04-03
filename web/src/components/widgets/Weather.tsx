import { useWidgetData } from '../../hooks/useWidgetData';
import type { FeedResponse, FeedItem } from '../../types';

interface WeatherMetadata {
  temp_f: number;
  temp_c: number;
  description: string;
  feels_like_f?: number;
  feels_like_c?: number;
  humidity?: number;
  wind_mph?: number;
  wind_kph?: number;
  forecast?: Array<{
    day: string;
    high_f: number;
    low_f: number;
    description: string;
  }>;
}

function WeatherForecastItem({
  day,
}: {
  day: NonNullable<WeatherMetadata['forecast']>[0];
}) {
  return (
    <div className="forecast-item">
      <div className="forecast-day">{day.day}</div>
      <div className="forecast-temps">
        <span className="forecast-high">{Math.round(day.high_f)}°</span>
        <span className="forecast-low">{Math.round(day.low_f)}°</span>
      </div>
      <div className="forecast-desc">{day.description}</div>
    </div>
  );
}

function WeatherCurrent({ metadata }: { metadata: WeatherMetadata }) {
  return (
    <div className="weather-current">
      <div className="temp-display">
        <div className="temp-main">
          <span className="temp-value">{Math.round(metadata.temp_f)}°</span>
          <span className="temp-unit">F</span>
        </div>
        <div className="temp-info">
          <div className="description">{metadata.description}</div>
          {metadata.feels_like_f !== undefined && (
            <div className="feels-like">
              Feels like {Math.round(metadata.feels_like_f)}°
            </div>
          )}
        </div>
      </div>

      <div className="weather-details">
        {metadata.humidity !== undefined && (
          <div className="detail">
            <span className="detail-label">Humidity</span>
            <span className="detail-value">{metadata.humidity}%</span>
          </div>
        )}
        {metadata.wind_mph !== undefined && (
          <div className="detail">
            <span className="detail-label">Wind</span>
            <span className="detail-value">{Math.round(metadata.wind_mph)} mph</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default function Weather() {
  const { data, loading, error } = useWidgetData<FeedResponse>(
    '/api/feed?source=weather&limit=10',
    300000
  );

  if (loading) return <div className="widget-loading">Loading weather...</div>;
  if (error) return <div className="widget-error">Error: {error}</div>;
  if (!data || data.items.length === 0) {
    return (
      <div className="widget-empty">
        <p>No weather data available</p>
      </div>
    );
  }

  const currentItem = data.items[0];
  const metadata = currentItem.metadata as unknown as WeatherMetadata;

  return (
    <div className="weather">
      <div className="widget-header">
        <h2>Weather</h2>
      </div>

      <WeatherCurrent metadata={metadata} />

      {metadata.forecast && metadata.forecast.length > 0 && (
        <div className="weather-forecast">
          <div className="forecast-title">Forecast</div>
          <div className="forecast-list">
            {metadata.forecast.slice(0, 5).map((day, idx) => (
              <WeatherForecastItem key={idx} day={day} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
