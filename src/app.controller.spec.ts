import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';

describe('AppController', () => {
  let appController: AppController;
  let appService: AppService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService],
    }).compile();

    appController = module.get<AppController>(AppController);
    appService = module.get<AppService>(AppService);
  });

  describe('root', () => {
    it('should be defined', () => {
      expect(appController).toBeDefined();
    });

    it('should return app info with name, version, and environment', () => {
      const result = {
        name: 'builder-api',
        version: '0.1.0',
        environment: 'test',
      };

      jest.spyOn(appService, 'getAppInfo').mockImplementation(() => result);

      expect(appController.getInfo()).toEqual(result);
    });

    it('should call appService.getAppInfo', () => {
      const getAppInfoSpy = jest.spyOn(appService, 'getAppInfo');
      appController.getInfo();
      expect(getAppInfoSpy).toHaveBeenCalled();
    });
  });
});
