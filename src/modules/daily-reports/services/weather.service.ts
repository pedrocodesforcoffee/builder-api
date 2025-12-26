import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { WeatherCondition } from '../enums/daily-report.enum';

/**
 * Weather Data Interface
 * Structure returned by weather service
 */
export interface WeatherData {
  temperatureHigh: number;
  temperatureLow: number;
  conditionAm: WeatherCondition;
  conditionPm: WeatherCondition;
  humidity: number;
  windSpeedMph: number;
  precipitationInches: number;
  source: string;
}

/**
 * Weather Service
 * Integrates with OpenWeatherMap API to fetch weather data
 * Supports both historical (past dates) and forecast (future dates) weather
 */
@Injectable()
export class WeatherService {
  private readonly logger = new Logger(WeatherService.name);
  private readonly apiKey: string;
  private readonly baseUrl = 'https://api.openweathermap.org/data/2.5';

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {
    this.apiKey = this.configService.get<string>('OPENWEATHER_API_KEY');
    if (!this.apiKey) {
      this.logger.warn(
        'OpenWeatherMap API key not configured. Weather auto-fetch will not work.',
      );
    }
  }

  /**
   * Get weather data for a specific location and date
   * Automatically determines whether to fetch historical or forecast data
   */
  async getWeatherData(
    lat: number,
    lon: number,
    date: string,
  ): Promise<WeatherData | null> {
    if (!this.apiKey) {
      this.logger.warn('Weather API key not configured, skipping weather fetch');
      return null;
    }

    try {
      const targetDate = new Date(date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (targetDate <= today) {
        // Historical weather
        return this.getHistoricalWeather(lat, lon, targetDate);
      } else {
        // Forecast weather
        return this.getForecastWeather(lat, lon, targetDate);
      }
    } catch (error) {
      this.logger.error(`Failed to fetch weather data: ${error.message}`);
      return null;
    }
  }

  /**
   * Fetch historical weather data (for past dates)
   * Uses OpenWeatherMap One Call API with time machine
   */
  private async getHistoricalWeather(
    lat: number,
    lon: number,
    date: Date,
  ): Promise<WeatherData | null> {
    try {
      const timestamp = Math.floor(date.getTime() / 1000);

      const response = await firstValueFrom(
        this.httpService.get(`${this.baseUrl}/onecall/timemachine`, {
          params: {
            lat,
            lon,
            dt: timestamp,
            appid: this.apiKey,
            units: 'imperial', // Fahrenheit, mph
          },
        }),
      );

      const data = response.data;
      const hourlyData = data.hourly || [];

      if (!hourlyData.length) {
        return null;
      }

      // Get morning (6-12) and afternoon (12-18) conditions
      const morningHours = hourlyData.filter((h: any) => {
        const hour = new Date(h.dt * 1000).getHours();
        return hour >= 6 && hour < 12;
      });

      const afternoonHours = hourlyData.filter((h: any) => {
        const hour = new Date(h.dt * 1000).getHours();
        return hour >= 12 && hour < 18;
      });

      const temperatures = hourlyData.map((h: any) => h.temp);
      const avgHumidity =
        hourlyData.reduce((sum: number, h: any) => sum + h.humidity, 0) /
        hourlyData.length;
      const avgWindSpeed =
        hourlyData.reduce((sum: number, h: any) => sum + h.wind_speed, 0) /
        hourlyData.length;
      const totalPrecip = hourlyData.reduce(
        (sum: number, h: any) => sum + (h.rain?.['1h'] || 0),
        0,
      );

      return {
        temperatureHigh: Math.round(Math.max(...temperatures)),
        temperatureLow: Math.round(Math.min(...temperatures)),
        conditionAm: this.mapWeatherCondition(
          morningHours[0]?.weather[0]?.main || 'Clear',
        ),
        conditionPm: this.mapWeatherCondition(
          afternoonHours[0]?.weather[0]?.main || 'Clear',
        ),
        humidity: Math.round(avgHumidity),
        windSpeedMph: Math.round(avgWindSpeed),
        precipitationInches: Math.round((totalPrecip / 25.4) * 100) / 100, // mm to inches
        source: 'OpenWeatherMap',
      };
    } catch (error) {
      this.logger.error(
        `Failed to fetch historical weather: ${error.message}`,
      );
      return null;
    }
  }

  /**
   * Fetch forecast weather data (for future dates)
   * Uses OpenWeatherMap 5-day forecast API
   */
  private async getForecastWeather(
    lat: number,
    lon: number,
    date: Date,
  ): Promise<WeatherData | null> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.baseUrl}/forecast`, {
          params: {
            lat,
            lon,
            appid: this.apiKey,
            units: 'imperial',
          },
        }),
      );

      const data = response.data;
      const targetDateStr = date.toISOString().split('T')[0];

      // Filter forecasts for the target date
      const dayForecasts = data.list.filter((item: any) => {
        return item.dt_txt.startsWith(targetDateStr);
      });

      if (!dayForecasts.length) {
        this.logger.warn(
          `No forecast data available for ${targetDateStr} (only 5 days available)`,
        );
        return null;
      }

      const temperatures = dayForecasts.map((f: any) => f.main.temp);
      const avgHumidity =
        dayForecasts.reduce((sum: number, f: any) => sum + f.main.humidity, 0) /
        dayForecasts.length;
      const avgWindSpeed =
        dayForecasts.reduce((sum: number, f: any) => sum + f.wind.speed, 0) /
        dayForecasts.length;
      const totalPrecip = dayForecasts.reduce(
        (sum: number, f: any) => sum + (f.rain?.['3h'] || 0),
        0,
      );

      // Morning = first forecast, afternoon = middle forecast
      const morningForecast = dayForecasts[0];
      const afternoonForecast =
        dayForecasts[Math.floor(dayForecasts.length / 2)];

      return {
        temperatureHigh: Math.round(Math.max(...temperatures)),
        temperatureLow: Math.round(Math.min(...temperatures)),
        conditionAm: this.mapWeatherCondition(
          morningForecast?.weather[0]?.main || 'Clear',
        ),
        conditionPm: this.mapWeatherCondition(
          afternoonForecast?.weather[0]?.main || 'Clear',
        ),
        humidity: Math.round(avgHumidity),
        windSpeedMph: Math.round(avgWindSpeed),
        precipitationInches: Math.round((totalPrecip / 25.4) * 100) / 100,
        source: 'OpenWeatherMap',
      };
    } catch (error) {
      this.logger.error(`Failed to fetch forecast weather: ${error.message}`);
      return null;
    }
  }

  /**
   * Map OpenWeatherMap condition strings to our enum values
   */
  private mapWeatherCondition(apiCondition: string): WeatherCondition {
    const mapping: Record<string, WeatherCondition> = {
      Clear: WeatherCondition.CLEAR,
      Clouds: WeatherCondition.CLOUDY,
      Rain: WeatherCondition.RAIN,
      Drizzle: WeatherCondition.RAIN,
      Thunderstorm: WeatherCondition.STORM,
      Snow: WeatherCondition.SNOW,
      Mist: WeatherCondition.FOG,
      Fog: WeatherCondition.FOG,
      Haze: WeatherCondition.FOG,
      Smoke: WeatherCondition.FOG,
    };

    return mapping[apiCondition] || WeatherCondition.CLEAR;
  }
}
