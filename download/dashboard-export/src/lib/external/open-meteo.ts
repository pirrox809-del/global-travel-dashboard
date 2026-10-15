/**
 * open-meteo.ts — Weather via Open-Meteo with wttr.in fallback.
 *
 * Primary: Open-Meteo (free, no key, 10k calls/day).
 * Fallback: wttr.in (free, no key) — used when Open-Meteo returns 429
 * (daily limit exceeded) or any other error. This double-source strategy
 * means the weather card keeps working even when one provider is down.
 *
 * Both responses are normalized to the same `WeatherSnapshot` shape so the
 * aggregator and UI don't care which source served the data.
 */
import { cache, TTL } from '@/lib/cache';

const OPEN_METEO_BASE = 'https://api.open-meteo.com/v1/forecast';
const WTTR_BASE = 'https://wttr.in';

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
  source: 'open-meteo' | 'wttr.in';
};

/** Fetch weather: try Open-Meteo first, fall back to wttr.in on failure. */
export async function getWeather(lat: number, lon: number): Promise<WeatherSnapshot> {
  const key = `weather:${lat.toFixed(2)},${lon.toFixed(2)}`;
  return cache.wrap(key, TTL.weather, async () => {
    try {
      return await fetchOpenMeteo(lat, lon);
    } catch (omErr) {
      // Open-Meteo failed (likely 429 daily limit) → try wttr.in.
      console.warn('[weather] Open-Meteo failed, trying wttr.in:', (omErr as Error).message);
      return fetchWttr(lat, lon);
    }
  });
}

/** Fetch from Open-Meteo. Throws on non-200 / 429 / network error. */
async function fetchOpenMeteo(lat: number, lon: number): Promise<WeatherSnapshot> {
  const url =
    `${OPEN_METEO_BASE}?latitude=${lat}&longitude=${lon}` +
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
    source: 'open-meteo',
  };
}

/**
 * Fetch from wttr.in (fallback). Normalizes the response to the same shape.
 * wttr.in returns current_condition + weather (3-day hourly forecast).
 */
async function fetchWttr(lat: number, lon: number): Promise<WeatherSnapshot> {
  const res = await fetch(`${WTTR_BASE}/${lat},${lon}?format=j1`, {
    next: { revalidate: TTL.weather },
  });
  if (!res.ok) throw new Error(`wttr.in error ${res.status}`);
  const j = await res.json();

  const cur = j.current_condition?.[0];
  if (!cur) throw new Error('wttr.in: no current_condition');

  // wttr.in weatherCode is WMO — same codes as Open-Meteo. Map to emoji.
  const weatherCode = Number(cur.weatherCode) || 0;
  const isDay = (cur.uvIndex ?? '1') !== '0' && Number(cur.uvIndex ?? '1') > 0;

  // Build hourly temps from the first day's hourly data.
  const today = j.weather?.[0];
  const hourlyTimes: string[] = [];
  const hourlyTemps: number[] = [];
  if (today?.hourly) {
    for (const h of today.hourly.slice(0, 24)) {
      hourlyTimes.push(h.time ?? '');
      hourlyTemps.push(Number(h.tempC ?? h.tempC ?? 0));
    }
  }

  // Build daily forecast (3 days from wttr.in).
  let daily: WeatherSnapshot['daily'] | undefined;
  if (j.weather?.length) {
    daily = {
      time: j.weather.map((d: { date: string }) => d.date),
      tempMax: j.weather.map((d: { maxtempC: string }) => Number(d.maxtempC)),
      tempMin: j.weather.map((d: { mintempC: string }) => Number(d.mintempC)),
      precipitationProb: j.weather.map((d: { hourly?: { chanceofrain?: string }[] }) =>
        Math.max(...(d.hourly ?? [{ chanceofrain: '0' }]).map((h) => Number(h.chanceofrain ?? '0'))),
      ),
      weatherCode: j.weather.map((d: { hourly?: { weatherCode?: string }[] }) =>
        Number(d.hourly?.[Math.floor((d.hourly?.length ?? 0) / 2)]?.weatherCode ?? '0'),
      ),
    };
  }

  return {
    current: {
      temperature: Number(cur.temp_C ?? cur.tempC ?? 0),
      apparentTemperature: Number(cur.FeelsLikeC ?? 0),
      windspeed: Number(cur.windspeedKmph ?? 0),
      weatherCode,
      isDay,
      time: cur.localObsDateTime ?? new Date().toISOString(),
    },
    hourly: { time: hourlyTimes, temperature: hourlyTemps },
    daily,
    units: { temperature: '°C', windspeed: 'km/h' },
    source: 'wttr.in',
  };
}

/** Map WMO weather code -> human description + emoji (shared by both sources). */
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
    // wttr.in extra codes (WWO weather codes)
    113: { label: 'Clear', emoji: '☀️' },
    116: { label: 'Partly cloudy', emoji: '⛅' },
    119: { label: 'Cloudy', emoji: '☁️' },
    122: { label: 'Overcast', emoji: '☁️' },
    143: { label: 'Mist', emoji: '🌫️' },
    140: { label: 'Mist', emoji: '🌫️' },
    149: { label: 'Haze', emoji: '🌫️' },
    176: { label: 'Patchy rain', emoji: '🌦️' },
    200: { label: 'Thunder', emoji: '⛈️' },
    227: { label: 'Light snow', emoji: '🌨️' },
    230: { label: 'Heavy snow', emoji: '❄️' },
    248: { label: 'Fog', emoji: '🌫️' },
    260: { label: 'Fog', emoji: '🌫️' },
    263: { label: 'Light drizzle', emoji: '🌦️' },
    266: { label: 'Drizzle', emoji: '🌦️' },
    281: { label: 'Freezing drizzle', emoji: '🌧️' },
    284: { label: 'Freezing rain', emoji: '🌧️' },
    293: { label: 'Light rain', emoji: '🌦️' },
    296: { label: 'Light rain', emoji: '🌦️' },
    299: { label: 'Rain', emoji: '🌧️' },
    302: { label: 'Rain', emoji: '🌧️' },
    305: { label: 'Heavy rain', emoji: '🌧️' },
    308: { label: 'Heavy rain', emoji: '🌧️' },
    311: { label: 'Freezing rain', emoji: '🌧️' },
    314: { label: 'Freezing rain', emoji: '🌧️' },
    317: { label: 'Freezing rain', emoji: '🌧️' },
    320: { label: 'Light snow', emoji: '🌨️' },
    323: { label: 'Light snow', emoji: '🌨️' },
    326: { label: 'Snow', emoji: '❄️' },
    329: { label: 'Snow', emoji: '❄️' },
    332: { label: 'Heavy snow', emoji: '❄️' },
    335: { label: 'Heavy snow', emoji: '❄️' },
    338: { label: 'Heavy snow', emoji: '❄️' },
    350: { label: 'Sleet', emoji: '🌧️' },
    353: { label: 'Rain showers', emoji: '🌦️' },
    356: { label: 'Rain showers', emoji: '🌧️' },
    359: { label: 'Violent showers', emoji: '⛈️' },
    362: { label: 'Sleet showers', emoji: '🌨️' },
    365: { label: 'Snow showers', emoji: '🌨️' },
    368: { label: 'Snow showers', emoji: '🌨️' },
    371: { label: 'Snow showers', emoji: '❄️' },
    374: { label: 'Sleet', emoji: '🌧️' },
    377: { label: 'Sleet', emoji: '🌧️' },
    386: { label: 'Thunder', emoji: '⛈️' },
    389: { label: 'Thunderstorm', emoji: '⛈️' },
    392: { label: 'Snow thunder', emoji: '🌨️' },
    395: { label: 'Snow thunder', emoji: '❄️' },
  };
  return map[code] ?? { label: 'Unknown', emoji: '🌡️' };
}
