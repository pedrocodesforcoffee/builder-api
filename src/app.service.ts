import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getAppInfo(): { name: string; version: string; environment: string } {
    return {
      name: 'builder-api',
      version: '0.1.0',
      environment: process.env.NODE_ENV || 'development',
    };
  }
}
