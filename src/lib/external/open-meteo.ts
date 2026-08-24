/**
 * open-meteo.ts — Weather via the Open-Meteo API (https://open-meteo.com).
 *
 * Why this API:
 *  - 100% free, NO API KEY, no sign-up.
 *  - Up to 10,000 calls/day for non-commercial use — perfect for our scale.
 *  - Returns current weather + short forecast in a single call.
 *
 * We pass lat/lng of the country capital (from our DB) and request:
 *  - current_weather: temperature + wind + weather_code
 *  - hourly: temperature_2m for next 24h (used to draw a mini trend)
 *  - daily: max/min temp + precipitation probability for next 7 days
 */
import { cache, TTL } from '@/lib/cache';

const BASE = 'https://api.open-meteo.com/v1/forecast';

export type WeatherSnapshot = {
  current: {
    temperature: number;
    apparentTemperature: number;
    windspeed: number;
    weatherCode: number;
    isDay: boolean;
    time: string;
  };
  hourly: { time: string[]; temperature: number[] };
  daily?: {
    time: string[];
    tempMax: number[];
    tempMin: number[];
    precipitationProb: number[];
    weatherCode: number[];
  };
  units: { temperature: string; windspeed: string };
};

/** Fetch a weather snapshot for a coordinate. Cached 20 minutes. */
export async function getWeather(lat: number, lon: number): Promise<WeatherSnapshot> {
  const key = `weather:${lat.toFixed(2)},${lon.toFixed(2)}`;
  return cache.wrap(key, TTL.weather, async () => {
    const url =
      `${BASE}?latitude=${lat}&longitude=${lon}` +
      `&current=temperature_2m,apparent_temperature,is_day,weather_code,wind_speed_10m` +
      `&hourly=temperature_2m&forecast_hours=24` +
      `&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max` +
      `&timezone=auto`;
    const res = await fetch(url, { next: { revalidate: TTL.weather } });
    if (!res.ok) throw new Error(`Open-Meteo error ${res.status}`);
    const j = await res.json();

    return {
      current: {
        temperature: j.current?.temperature_2m ?? j.current?.temperature,
        apparentTemperature: j.current?.apparent_temperature,
        windspeed: j.current?.wind_speed_10m ?? j.current?.wind_speed,
        weatherCode: j.current?.weather_code,
        isDay: j.current?.is_day ?? true,
        time: j.current?.time,
      },
      hourly: {
        time: j.hourly?.time ?? [],
        temperature: j.hourly?.temperature_2m ?? [],
      },
      daily: j.daily
        ? {
            time: j.daily.time,
            tempMax: j.daily.temperature_2m_max,
            tempMin: j.daily.temperature_2m_min,
            precipitationProb: j.daily.precipitation_probability_max,
            weatherCode: j.daily.weather_code,
          }
        : undefined,
      units: {
        temperature: j.current_units?.temperature_2m ?? '°C',
        windspeed: j.current_units?.wind_speed_10m ?? 'km/h',
      },
    };
  });
}

/** Map WMO weather code -> human description + emoji (Open-Meteo spec). */
export function describeWeatherCode(code: number): { label: string; emoji: string } {
  const map: Record<number, { label: string; emoji: string }> = {
    0: { label: 'Clear sky', emoji: '☀️' },
    1: { label: 'Mainly clear', emoji: '🌤️' },
    2: { label: 'Partly cloudy', emoji: '⛅' },
    3: { label: 'Overcast', emoji: '☁️' },
    45: { label: 'Fog', emoji: '🌫️' },
    48: { label: 'Rime fog', emoji: '🌫️' },
    51: { label: 'Light drizzle', emoji: '🌦️' },
    53: { label: 'Drizzle', emoji: '🌦️' },
    55: { label: 'Heavy drizzle', emoji: '🌧️' },
    56: { label: 'Freezing drizzle', emoji: '🌧️' },
    57: { label: 'Freezing drizzle', emoji: '🌧️' },
    61: { label: 'Light rain', emoji: '🌦️' },
    63: { label: 'Rain', emoji: '🌧️' },
    65: { label: 'Heavy rain', emoji: '🌧️' },
    66: { label: 'Freezing rain', emoji: '🌧️' },
    67: { label: 'Freezing rain', emoji: '🌧️' },
    71: { label: 'Light snow', emoji: '🌨️' },
    73: { label: 'Snow', emoji: '❄️' },
    75: { label: 'Heavy snow', emoji: '❄️' },
    77: { label: 'Snow grains', emoji: '🌨️' },
    80: { label: 'Rain showers', emoji: '🌦️' },
    81: { label: 'Rain showers', emoji: '🌧️' },
    82: { label: 'Violent showers', emoji: '⛈️' },
    85: { label: 'Snow showers', emoji: '🌨️' },
    86: { label: 'Snow showers', emoji: '❄️' },
    95: { label: 'Thunderstorm', emoji: '⛈️' },
    96: { label: 'Thunderstorm + hail', emoji: '⛈️' },
    99: { label: 'Severe thunderstorm', emoji: '🌩️' },
  };
  return map[code] ?? { label: 'Unknown', emoji: '🌡️' };
}
