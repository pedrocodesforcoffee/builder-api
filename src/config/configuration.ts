export default () => ({
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3000', 10),
  apiPrefix: process.env.API_PREFIX || 'api',
  database: {
    url: process.env.DATABASE_URL,
  },
  jwt: {
    secret: process.env.JWT_SECRET,
    expiration: process.env.JWT_EXPIRATION || '15m',
    refreshTokenExpiration: process.env.REFRESH_TOKEN_EXPIRATION || '7d',
  },
  redis: {
    url: process.env.REDIS_URL,
  },
  logging: {
    level: process.env.LOG_LEVEL || 'info',
  },
  rateLimit: {
    window: parseInt(process.env.RATE_LIMIT_WINDOW || '900000', 10),
    max: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
  },
});
