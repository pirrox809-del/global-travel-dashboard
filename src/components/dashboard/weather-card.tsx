'use client';

import { CloudSun, Wind, Thermometer, Droplets } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { CountryDynamic } from '@/lib/types';
import { SourceBadge } from './source-badge';

/** Live weather card (Open-Meteo). Degrades to an error badge if the source failed. */
export function WeatherCard({ weather }: { weather: CountryDynamic['weather'] }) {
  return (
    <Card className="animate-card-in">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <CloudSun className="size-4 text-amber-500" />
          Current Weather
        </CardTitle>
        <SourceBadge source="open-meteo" />
      </CardHeader>
      <CardContent>
        {'error' in weather ? (
          <ErrorState message={weather.error} />
        ) : (
          <div>
            <div className="flex items-end gap-3">
              <span className="text-5xl">{weather.weatherEmoji}</span>
              <div>
                <div className="text-4xl font-bold leading-none">
                  {Math.round(weather.temperature)}
                  <span className="text-lg text-muted-foreground">{weather.units.temperature}</span>
                </div>
                <div className="text-sm text-muted-foreground">{weather.weatherLabel}</div>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
              <Stat icon={<Thermometer className="size-3.5" />} label="Feels like" value={`${Math.round(weather.apparentTemperature)}${weather.units.temperature}`} />
              <Stat icon={<Wind className="size-3.5" />} label="Wind" value={`${Math.round(weather.windspeed)} ${weather.units.windspeed}`} />
            </div>

            {/* 24h temperature sparkline-ish list */}
            {weather.hourly.temperature.length > 0 ? (
              <div className="mt-4">
                <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground mb-2">
                  Next 24h
                </div>
                <div className="flex items-end gap-0.5 h-12">
                  {weather.hourly.temperature.slice(0, 24).map((t, i) => {
                    const temps = weather.hourly.temperature.slice(0, 24);
                    const min = Math.min(...temps);
                    const max = Math.max(...temps);
                    const range = Math.max(1, max - min);
                    const h = 8 + ((t - min) / range) * 36;
                    return (
                      <div
                        key={i}
                        className="flex-1 rounded-t bg-gradient-to-t from-amber-400 to-rose-400"
                        style={{ height: `${h}px` }}
                        title={`${Math.round(t)}${weather.units.temperature} · ${weather.hourly.time[i]}`}
                      />
                    );
                  })}
                </div>
              </div>
            ) : null}

            {/* 7-day forecast */}
            {weather.daily ? (
              <div className="mt-4 space-y-1.5">
                <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  7-day outlook
                </div>
                <div className="max-h-40 overflow-y-auto scroll-soft space-y-1">
                  {weather.daily.time.slice(0, 7).map((d, i) => (
                    <div key={d} className="flex items-center justify-between text-xs py-1 border-b last:border-0">
                      <span className="w-20 text-muted-foreground">
                        {new Date(d).toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' })}
                      </span>
                      <span className="flex items-center gap-1 text-xs">
                        <Droplets className="size-3 text-sky-500" />
                        {weather.daily!.precipitationProb[i] ?? 0}%
                      </span>
                      <span className="tabular-nums">
                        <span className="text-rose-500">{Math.round(weather.daily.tempMax[i])}°</span>
                        {' / '}
                        <span className="text-sky-600 dark:text-sky-400">{Math.round(weather.daily.tempMin[i])}°</span>
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 rounded-md bg-muted/40 px-2 py-1.5">
      <span className="text-muted-foreground">{icon}</span>
      <span className="text-muted-foreground text-xs">{label}</span>
      <span className="ml-auto font-medium tabular-nums">{value}</span>
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-6 text-center">
      <span className="text-3xl">🌫️</span>
      <p className="mt-2 text-sm text-muted-foreground">Weather unavailable</p>
      <Badge variant="outline" className="mt-2 text-[10px] font-normal opacity-70 max-w-full truncate">
        {message}
      </Badge>
    </div>
  );
}
