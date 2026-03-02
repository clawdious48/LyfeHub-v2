import { CloudSun, Droplets, Wind, Thermometer } from 'lucide-react'
import { useWeather } from '@/api/hooks/useWeather.js'

interface WeatherWidgetProps {
  config?: Record<string, unknown>
}

function ForecastItem({ temp, icon, dt, units }: { temp: number; icon: string; dt: number; units: string }) {
  const time = new Date(dt * 1000).toLocaleTimeString('en-US', { hour: 'numeric' })
  const deg = units === 'metric' ? 'C' : 'F'

  return (
    <div className="flex flex-col items-center gap-0.5">
      <span className="text-[11px] text-text-muted">{time}</span>
      <img
        src={`https://openweathermap.org/img/wn/${icon}@2x.png`}
        alt=""
        className="size-8"
      />
      <span className="text-xs text-text-secondary font-medium">
        {temp}&deg;{deg}
      </span>
    </div>
  )
}

export default function WeatherWidget({ config }: WeatherWidgetProps) {
  const city = (config?.city as string) || ''
  const units = (config?.units as string) || 'imperial'
  const deg = units === 'metric' ? 'C' : 'F'
  const speedUnit = units === 'metric' ? 'km/h' : 'mph'

  const { data, isLoading, error } = useWeather(city, units)

  if (!city) {
    return (
      <div className="flex flex-col items-center justify-center py-8 gap-3">
        <CloudSun className="size-10 text-text-muted" />
        <p className="text-text-secondary text-sm text-center">
          Set your city in widget settings
        </p>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex flex-col gap-3 animate-pulse">
        <div className="flex items-center gap-4">
          <div className="size-14 rounded-lg bg-bg-hover" />
          <div className="flex-1 space-y-2">
            <div className="h-8 w-20 rounded bg-bg-hover" />
            <div className="h-4 w-32 rounded bg-bg-hover" />
          </div>
        </div>
        <div className="flex gap-4 pt-2">
          <div className="h-3 w-16 rounded bg-bg-hover" />
          <div className="h-3 w-16 rounded bg-bg-hover" />
          <div className="h-3 w-16 rounded bg-bg-hover" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-8 gap-2">
        <CloudSun className="size-8 text-text-muted" />
        <p className="text-red-400 text-sm text-center">
          {error instanceof Error ? error.message : 'Failed to load weather'}
        </p>
      </div>
    )
  }

  if (!data) return null

  const { current, forecast } = data
  const forecastSlice = forecast.slice(0, 4)

  return (
    <div className="flex flex-col gap-3">
      {/* Current weather */}
      <div className="flex items-center gap-3">
        <img
          src={`https://openweathermap.org/img/wn/${current.icon}@2x.png`}
          alt={current.description}
          className="size-16 -ml-2"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-1.5">
            <span className="text-3xl font-semibold text-text-primary">
              {current.temp}&deg;{deg}
            </span>
          </div>
          <p className="text-sm text-text-secondary truncate">{current.city}</p>
          <p className="text-xs text-text-muted capitalize">{current.description}</p>
        </div>
      </div>

      {/* Detail row */}
      <div className="flex items-center gap-4 text-xs text-text-secondary">
        <span className="flex items-center gap-1">
          <Thermometer className="size-3 text-text-muted" />
          Feels {current.feels_like}&deg;
        </span>
        <span className="flex items-center gap-1">
          <Droplets className="size-3 text-text-muted" />
          {current.humidity}%
        </span>
        <span className="flex items-center gap-1">
          <Wind className="size-3 text-text-muted" />
          {current.wind_speed} {speedUnit}
        </span>
      </div>

      {/* Forecast strip */}
      {forecastSlice.length > 0 && (
        <div className="flex items-center justify-between pt-1 border-t border-border">
          {forecastSlice.map((f) => (
            <ForecastItem
              key={f.dt}
              temp={f.temp}
              icon={f.icon}
              dt={f.dt}
              units={units}
            />
          ))}
        </div>
      )}
    </div>
  )
}
