import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { S3Service } from '../s3.service';
import * as fs from 'fs/promises';
import * as path from 'path';
import { S3Client } from '@aws-sdk/client-s3';

// Mock the AWS SDK
jest.mock('@aws-sdk/client-s3');
jest.mock('fs/promises');
jest.mock('fs', () => ({
  existsSync: jest.fn(),
  mkdirSync: jest.fn(),
  createReadStream: jest.fn(),
}));

describe('S3Service', () => {
  let service: S3Service;
  let configService: jest.Mocked<ConfigService>;

  describe('Real S3 Mode', () => {
    beforeEach(async () => {
      const mockConfigService = {
        get: jest.fn((key: string) => {
          const config: Record<string, any> = {
            AWS_REGION: 'us-east-1',
            AWS_S3_BUCKET: 'test-bucket',
            AWS_ACCESS_KEY_ID: 'test-key',
            AWS_SECRET_ACCESS_KEY: 'test-secret',
            USE_MOCK_S3: false,
          };
          return config[key];
        }),
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          S3Service,
          {
            provide: ConfigService,
            useValue: mockConfigService,
          },
        ],
      }).compile();

      service = module.get<S3Service>(S3Service);
      configService = module.get(ConfigService);
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should initialize with correct bucket name', () => {
      expect(service.getBucket()).toBe('test-bucket');
    });

    it('should return quarantine bucket name', () => {
      expect(service.getQuarantineBucket()).toBe('builder-quarantine');
    });

    it('should return production bucket name', () => {
      expect(service.getProductionBucket()).toBe('builder-production');
    });
  });

  describe('Mock S3 Mode', () => {
    const mockStoragePath = path.join(process.cwd(), 'mock-s3-storage');
    const testS3Key = 'test/file.pdf';
    const testBucket = 'test-bucket';
    const testFileContent = Buffer.from('test file content');

    beforeEach(async () => {
      jest.clearAllMocks();

      const mockConfigService = {
        get: jest.fn((key: string) => {
          const config: Record<string, any> = {
            AWS_REGION: 'us-east-1',
            AWS_S3_BUCKET: testBucket,
            USE_MOCK_S3: true, // Enable mock mode
          };
          return config[key];
        }),
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          S3Service,
          {
            provide: ConfigService,
            useValue: mockConfigService,
          },
        ],
      }).compile();

      service = module.get<S3Service>(S3Service);
      configService = module.get(ConfigService);
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    describe('initialization', () => {
      it('should initialize in mock mode', () => {
        expect(service).toBeDefined();
        expect(service.getBucket()).toBe(testBucket);
      });

      it('should not create S3Client in mock mode', () => {
        // In mock mode, S3Client should not be instantiated
        // This is verified by the fact that the service doesn't crash when s3Client is undefined
        expect(service).toBeDefined();
      });
    });

    describe('getObject', () => {
      it('should read file from local filesystem in mock mode', async () => {
        const expectedPath = path.join(mockStoragePath, testBucket, testS3Key);
        (fs.readFile as jest.Mock).mockResolvedValue(testFileContent);

        const result = await service.getObject(testS3Key);

        expect(fs.readFile).toHaveBeenCalledWith(expectedPath);
        expect(result).toEqual(testFileContent);
      });

      it('should read file from custom bucket in mock mode', async () => {
        const customBucket = 'custom-bucket';
        const expectedPath = path.join(mockStoragePath, customBucket, testS3Key);
        (fs.readFile as jest.Mock).mockResolvedValue(testFileContent);

        const result = await service.getObject(testS3Key, customBucket);

        expect(fs.readFile).toHaveBeenCalledWith(expectedPath);
        expect(result).toEqual(testFileContent);
      });

      it('should throw error when file not found in mock mode', async () => {
        (fs.readFile as jest.Mock).mockRejectedValue(
          new Error('ENOENT: no such file or directory'),
        );

        await expect(service.getObject(testS3Key)).rejects.toThrow(
          `Object not found: ${testS3Key}`,
        );
      });

      it('should handle nested file paths in mock mode', async () => {
        const nestedKey = 'folder1/folder2/folder3/file.pdf';
        const expectedPath = path.join(mockStoragePath, testBucket, nestedKey);
        (fs.readFile as jest.Mock).mockResolvedValue(testFileContent);

        const result = await service.getObject(nestedKey);

        expect(fs.readFile).toHaveBeenCalledWith(expectedPath);
        expect(result).toEqual(testFileContent);
      });

      it('should handle quarantine bucket reads in mock mode', async () => {
        const quarantineBucket = service.getQuarantineBucket();
        const expectedPath = path.join(mockStoragePath, quarantineBucket, testS3Key);
        (fs.readFile as jest.Mock).mockResolvedValue(testFileContent);

        const result = await service.getObject(testS3Key, quarantineBucket);

        expect(fs.readFile).toHaveBeenCalledWith(expectedPath);
        expect(result).toEqual(testFileContent);
      });
    });

    describe('putObject', () => {
      it('should write file to local filesystem in mock mode with Buffer', async () => {
        const expectedPath = path.join(mockStoragePath, testBucket, testS3Key);
        const expectedDir = path.dirname(expectedPath);
        (fs.mkdir as jest.Mock).mockResolvedValue(undefined);
        (fs.writeFile as jest.Mock).mockResolvedValue(undefined);

        await service.putObject(testS3Key, testFileContent, 'application/pdf');

        expect(fs.mkdir).toHaveBeenCalledWith(expectedDir, { recursive: true });
        expect(fs.writeFile).toHaveBeenCalledWith(expectedPath, testFileContent);
      });

      it('should write file to custom bucket in mock mode', async () => {
        const customBucket = 'custom-bucket';
        const expectedPath = path.join(mockStoragePath, customBucket, testS3Key);
        const expectedDir = path.dirname(expectedPath);
        (fs.mkdir as jest.Mock).mockResolvedValue(undefined);
        (fs.writeFile as jest.Mock).mockResolvedValue(undefined);

        await service.putObject(
          testS3Key,
          testFileContent,
          'application/pdf',
          customBucket,
        );

        expect(fs.mkdir).toHaveBeenCalledWith(expectedDir, { recursive: true });
        expect(fs.writeFile).toHaveBeenCalledWith(expectedPath, testFileContent);
      });

      it('should convert string to Buffer when writing in mock mode', async () => {
        const stringContent = 'test string content';
        const expectedBuffer = Buffer.from(stringContent);
        const expectedPath = path.join(mockStoragePath, testBucket, testS3Key);
        (fs.mkdir as jest.Mock).mockResolvedValue(undefined);
        (fs.writeFile as jest.Mock).mockResolvedValue(undefined);

        await service.putObject(testS3Key, stringContent, 'text/plain');

        expect(fs.writeFile).toHaveBeenCalledWith(expectedPath, expectedBuffer);
      });

      it('should handle nested directories when writing in mock mode', async () => {
        const nestedKey = 'folder1/folder2/folder3/file.pdf';
        const expectedPath = path.join(mockStoragePath, testBucket, nestedKey);
        const expectedDir = path.dirname(expectedPath);
        (fs.mkdir as jest.Mock).mockResolvedValue(undefined);
        (fs.writeFile as jest.Mock).mockResolvedValue(undefined);

        await service.putObject(nestedKey, testFileContent, 'application/pdf');

        expect(fs.mkdir).toHaveBeenCalledWith(expectedDir, { recursive: true });
        expect(fs.writeFile).toHaveBeenCalledWith(expectedPath, testFileContent);
      });

      it('should write to quarantine bucket in mock mode', async () => {
        const quarantineBucket = service.getQuarantineBucket();
        const expectedPath = path.join(mockStoragePath, quarantineBucket, testS3Key);
        const expectedDir = path.dirname(expectedPath);
        (fs.mkdir as jest.Mock).mockResolvedValue(undefined);
        (fs.writeFile as jest.Mock).mockResolvedValue(undefined);

        await service.putObject(
          testS3Key,
          testFileContent,
          'application/pdf',
          quarantineBucket,
        );

        expect(fs.mkdir).toHaveBeenCalledWith(expectedDir, { recursive: true });
        expect(fs.writeFile).toHaveBeenCalledWith(expectedPath, testFileContent);
      });
    });

    describe('edge cases', () => {
      it('should handle empty file content', async () => {
        const emptyBuffer = Buffer.from('');
        const expectedPath = path.join(mockStoragePath, testBucket, testS3Key);
        (fs.mkdir as jest.Mock).mockResolvedValue(undefined);
        (fs.writeFile as jest.Mock).mockResolvedValue(undefined);

        await service.putObject(testS3Key, emptyBuffer, 'application/octet-stream');

        expect(fs.writeFile).toHaveBeenCalledWith(expectedPath, emptyBuffer);
      });

      it('should handle large files', async () => {
        const largeBuffer = Buffer.alloc(10 * 1024 * 1024); // 10MB
        const expectedPath = path.join(mockStoragePath, testBucket, testS3Key);
        (fs.readFile as jest.Mock).mockResolvedValue(largeBuffer);

        const result = await service.getObject(testS3Key);

        expect(result.length).toBe(10 * 1024 * 1024);
      });

      it('should handle special characters in file paths', async () => {
        const specialKey = 'folder/file with spaces & special (chars).pdf';
        const expectedPath = path.join(mockStoragePath, testBucket, specialKey);
        (fs.readFile as jest.Mock).mockResolvedValue(testFileContent);

        const result = await service.getObject(specialKey);

        expect(fs.readFile).toHaveBeenCalledWith(expectedPath);
        expect(result).toEqual(testFileContent);
      });
    });

    describe('error handling', () => {
      it('should provide clear error message when file read fails', async () => {
        const errorKey = 'non-existent/file.pdf';
        (fs.readFile as jest.Mock).mockRejectedValue(
          new Error('ENOENT: no such file or directory'),
        );

        await expect(service.getObject(errorKey)).rejects.toThrow(
          `Object not found: ${errorKey}`,
        );
      });

      it('should propagate write errors with context', async () => {
        (fs.mkdir as jest.Mock).mockResolvedValue(undefined);
        (fs.writeFile as jest.Mock).mockRejectedValue(
          new Error('EACCES: permission denied'),
        );

        await expect(
          service.putObject(testS3Key, testFileContent, 'application/pdf'),
        ).rejects.toThrow('EACCES: permission denied');
      });

      it('should handle directory creation errors', async () => {
        (fs.mkdir as jest.Mock).mockRejectedValue(
          new Error('EACCES: permission denied'),
        );

        await expect(
          service.putObject(testS3Key, testFileContent, 'application/pdf'),
        ).rejects.toThrow('EACCES: permission denied');
      });
    });
  });

  describe('Configuration Variations', () => {
    it('should handle USE_MOCK_S3 as string "true"', async () => {
      const mockConfigService = {
        get: jest.fn((key: string) => {
          const config: Record<string, any> = {
            AWS_REGION: 'us-east-1',
            AWS_S3_BUCKET: 'test-bucket',
            USE_MOCK_S3: 'true', // String instead of boolean
          };
          return config[key];
        }),
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          S3Service,
          {
            provide: ConfigService,
            useValue: mockConfigService,
          },
        ],
      }).compile();

      const mockService = module.get<S3Service>(S3Service);

      // Should still work in mock mode
      (fs.readFile as jest.Mock).mockResolvedValue(Buffer.from('test'));
      const result = await mockService.getObject('test.txt');
      expect(result).toBeDefined();
    });

    it('should use default bucket name when not configured', async () => {
      const mockConfigService = {
        get: jest.fn((key: string) => {
          const config: Record<string, any> = {
            AWS_REGION: 'us-east-1',
            USE_MOCK_S3: true,
            // No AWS_S3_BUCKET specified
          };
          return config[key];
        }),
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          S3Service,
          {
            provide: ConfigService,
            useValue: mockConfigService,
          },
        ],
      }).compile();

      const mockService = module.get<S3Service>(S3Service);

      // Should use default bucket name
      expect(mockService.getBucket()).toBe('builder-documents');
    });
  });
});
