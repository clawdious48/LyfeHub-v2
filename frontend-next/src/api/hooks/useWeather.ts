import { useQuery } from '@tanstack/react-query'
import { apiClient } from '../client.js'

interface WeatherCurrent {
  temp: number
  feels_like: number
  description: string
  icon: string
  humidity: number
  wind_speed: number
  city: string
}

interface WeatherForecast {
  dt: number
  temp: number
  icon: string
  description: string
}

interface WeatherResponse {
  current: WeatherCurrent
  forecast: WeatherForecast[]
}

export const weatherKeys = {
  all: ['weather'] as const,
  current: (city: string, units: string) => [...weatherKeys.all, city, units] as const,
}

export function useWeather(city: string, units: string = 'imperial') {
  return useQuery({
    queryKey: weatherKeys.current(city, units),
    queryFn: () => apiClient.get<WeatherResponse>(`/weather?city=${encodeURIComponent(city)}&units=${units}`),
    enabled: !!city,
    staleTime: 30 * 60 * 1000,
    refetchInterval: 30 * 60 * 1000,
  })
}
