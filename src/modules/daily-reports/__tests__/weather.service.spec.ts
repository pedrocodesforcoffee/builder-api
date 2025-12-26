import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { of, throwError } from 'rxjs';
import { WeatherService } from '../services/weather.service';
import { WeatherCondition } from '../enums/daily-report.enum';

describe('WeatherService', () => {
  let service: WeatherService;
  let httpService: jest.Mocked<HttpService>;
  let configService: jest.Mocked<ConfigService>;

  const mockApiKey = 'test-api-key-12345';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WeatherService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue(mockApiKey),
          },
        },
        {
          provide: HttpService,
          useValue: {
            get: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<WeatherService>(WeatherService);
    httpService = module.get(HttpService);
    configService = module.get(ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getWeatherData', () => {
    const lat = 37.7749;
    const lon = -122.4194;

    it('should return null if API key is not configured', async () => {
      // Create a new service instance without API key
      const moduleWithoutKey = await Test.createTestingModule({
        providers: [
          WeatherService,
          {
            provide: ConfigService,
            useValue: {
              get: jest.fn().mockReturnValue(null),
            },
          },
          {
            provide: HttpService,
            useValue: {
              get: jest.fn(),
            },
          },
        ],
      }).compile();

      const serviceWithoutKey = moduleWithoutKey.get<WeatherService>(WeatherService);

      const result = await serviceWithoutKey.getWeatherData(lat, lon, '2025-01-15');

      expect(result).toBeNull();
    });

    it('should fetch historical weather for past dates', async () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 7);
      const dateString = pastDate.toISOString().split('T')[0];

      const mockResponse = {
        data: {
          hourly: [
            {
              dt: Math.floor(pastDate.getTime() / 1000) + 3600 * 8, // 8 AM
              temp: 65,
              humidity: 70,
              wind_speed: 10,
              rain: { '1h': 0.5 },
              weather: [{ main: 'Rain' }],
            },
            {
              dt: Math.floor(pastDate.getTime() / 1000) + 3600 * 14, // 2 PM
              temp: 72,
              humidity: 65,
              wind_speed: 12,
              rain: { '1h': 0 },
              weather: [{ main: 'Clear' }],
            },
          ],
        },
      };

      httpService.get.mockReturnValue(of(mockResponse as any));

      const result = await service.getWeatherData(lat, lon, dateString);

      expect(result).toBeDefined();
      expect(result.temperatureHigh).toBeGreaterThanOrEqual(result.temperatureLow);
      expect(result.conditionAm).toBe(WeatherCondition.RAIN);
      expect(result.conditionPm).toBe(WeatherCondition.CLEAR);
      expect(result.source).toBe('OpenWeatherMap');
      expect(httpService.get).toHaveBeenCalledWith(
        expect.stringContaining('/onecall/timemachine'),
        expect.objectContaining({
          params: expect.objectContaining({
            lat,
            lon,
            appid: mockApiKey,
            units: 'imperial',
          }),
        }),
      );
    });

    it('should fetch forecast weather for future dates', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 3);
      const dateString = futureDate.toISOString().split('T')[0];

      const mockResponse = {
        data: {
          list: [
            {
              dt_txt: `${dateString} 09:00:00`,
              main: { temp: 68, humidity: 60 },
              wind: { speed: 8 },
              rain: { '3h': 0 },
              weather: [{ main: 'Clouds' }],
            },
            {
              dt_txt: `${dateString} 15:00:00`,
              main: { temp: 75, humidity: 55 },
              wind: { speed: 10 },
              rain: { '3h': 0 },
              weather: [{ main: 'Clear' }],
            },
          ],
        },
      };

      httpService.get.mockReturnValue(of(mockResponse as any));

      const result = await service.getWeatherData(lat, lon, dateString);

      expect(result).toBeDefined();
      expect(result.temperatureHigh).toBe(75);
      expect(result.temperatureLow).toBe(68);
      expect(result.conditionAm).toBe(WeatherCondition.CLOUDY);
      expect(result.conditionPm).toBe(WeatherCondition.CLEAR);
      expect(result.source).toBe('OpenWeatherMap');
      expect(httpService.get).toHaveBeenCalledWith(
        expect.stringContaining('/forecast'),
        expect.objectContaining({
          params: expect.objectContaining({
            lat,
            lon,
            appid: mockApiKey,
            units: 'imperial',
          }),
        }),
      );
    });

    it('should return null if forecast data not available for date', async () => {
      const farFutureDate = new Date();
      farFutureDate.setDate(farFutureDate.getDate() + 10); // Beyond 5-day forecast
      const dateString = farFutureDate.toISOString().split('T')[0];

      const mockResponse = {
        data: {
          list: [], // No data for this date
        },
      };

      httpService.get.mockReturnValue(of(mockResponse as any));

      const result = await service.getWeatherData(lat, lon, dateString);

      expect(result).toBeNull();
    });

    it('should return null and log error on API failure', async () => {
      const dateString = '2025-01-15';

      httpService.get.mockReturnValue(throwError(() => new Error('API Error')));

      const result = await service.getWeatherData(lat, lon, dateString);

      expect(result).toBeNull();
    });

    it('should map various weather conditions correctly', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);
      const dateString = futureDate.toISOString().split('T')[0];

      const weatherConditions = [
        { api: 'Clear', expected: WeatherCondition.CLEAR },
        { api: 'Clouds', expected: WeatherCondition.CLOUDY },
        { api: 'Rain', expected: WeatherCondition.RAIN },
        { api: 'Drizzle', expected: WeatherCondition.RAIN },
        { api: 'Thunderstorm', expected: WeatherCondition.STORM },
        { api: 'Snow', expected: WeatherCondition.SNOW },
        { api: 'Fog', expected: WeatherCondition.FOG },
        { api: 'Mist', expected: WeatherCondition.FOG },
      ];

      for (const condition of weatherConditions) {
        const mockResponse = {
          data: {
            list: [
              {
                dt_txt: `${dateString} 12:00:00`,
                main: { temp: 70, humidity: 60 },
                wind: { speed: 8 },
                rain: {},
                weather: [{ main: condition.api }],
              },
            ],
          },
        };

        httpService.get.mockReturnValue(of(mockResponse as any));

        const result = await service.getWeatherData(lat, lon, dateString);

        expect(result.conditionAm).toBe(condition.expected);
      }
    });
  });

  describe('precipitation calculation', () => {
    it('should correctly convert mm to inches', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);
      const dateString = futureDate.toISOString().split('T')[0];

      const mockResponse = {
        data: {
          list: [
            {
              dt_txt: `${dateString} 12:00:00`,
              main: { temp: 70, humidity: 60 },
              wind: { speed: 8 },
              rain: { '3h': 25.4 }, // 25.4mm = 1 inch
              weather: [{ main: 'Rain' }],
            },
          ],
        },
      };

      httpService.get.mockReturnValue(of(mockResponse as any));

      const result = await service.getWeatherData(lat, lon, dateString);

      expect(result.precipitationInches).toBe(1);
    });
  });
});
