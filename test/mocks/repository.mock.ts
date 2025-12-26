import { Repository, FindManyOptions, FindOneOptions, FindOptionsWhere } from 'typeorm';
import { createMock, DeepMocked } from 'jest-mock-extended';

/**
 * Create a mock TypeORM repository
 */
export function createMockRepository<T>(): DeepMocked<Repository<T>> {
  const mock = createMock<Repository<T>>();

  // Set up default implementations
  mock.save.mockImplementation(async (entity: any) => entity);
  mock.find.mockResolvedValue([]);
  mock.findOne.mockResolvedValue(null);
  mock.findOneBy.mockResolvedValue(null);
  mock.findAndCount.mockResolvedValue([[], 0]);
  mock.count.mockResolvedValue(0);
  mock.create.mockImplementation((entity: any) => entity as T);
  mock.delete.mockResolvedValue({ affected: 1, raw: {} });
  mock.remove.mockImplementation(async (entity: any) => entity);
  mock.update.mockResolvedValue({ affected: 1, raw: {}, generatedMaps: [] });

  return mock;
}

/**
 * Setup mock repository to return specific data
 */
export function setupMockRepository<T>(
  repository: DeepMocked<Repository<T>>,
  data: {
    find?: T[];
    findOne?: T | null;
    save?: T;
    count?: number;
  }
) {
  if (data.find !== undefined) {
    repository.find.mockResolvedValue(data.find);
  }

  if (data.findOne !== undefined) {
    repository.findOne.mockResolvedValue(data.findOne);
    repository.findOneBy.mockResolvedValue(data.findOne);
  }

  if (data.save !== undefined) {
    repository.save.mockResolvedValue(data.save);
  }

  if (data.count !== undefined) {
    repository.count.mockResolvedValue(data.count);
    repository.findAndCount.mockResolvedValue([data.find || [], data.count]);
  }

  return repository;
}

/**
 * Create a mock repository with predefined entities
 */
export function createMockRepositoryWithData<T>(entities: T[]): DeepMocked<Repository<T>> {
  const repository = createMockRepository<T>();

  // Find all
  repository.find.mockResolvedValue(entities);

  // Find one (returns first entity)
  repository.findOne.mockImplementation(async (options: FindOneOptions<T>) => {
    return entities[0] || null;
  });

  repository.findOneBy.mockImplementation(async (where: FindOptionsWhere<T>) => {
    return entities[0] || null;
  });

  // Save (adds to entities or returns saved entity)
  repository.save.mockImplementation(async (entity: any) => {
    if (Array.isArray(entity)) {
      entities.push(...entity);
      return entity;
    }
    entities.push(entity);
    return entity;
  });

  // Count
  repository.count.mockResolvedValue(entities.length);

  // Find and count
  repository.findAndCount.mockResolvedValue([entities, entities.length]);

  // Create
  repository.create.mockImplementation((entity: any) => entity as T);

  // Delete
  repository.delete.mockImplementation(async (criteria: any) => {
    return { affected: 1, raw: {} };
  });

  // Remove
  repository.remove.mockImplementation(async (entity: any) => {
    if (Array.isArray(entity)) {
      entity.forEach((e) => {
        const index = entities.indexOf(e);
        if (index > -1) entities.splice(index, 1);
      });
      return entity;
    }
    const index = entities.indexOf(entity);
    if (index > -1) entities.splice(index, 1);
    return entity;
  });

  return repository;
}

/**
 * Verify repository method was called with specific criteria
 */
export function expectRepositoryCalled<T>(
  repository: DeepMocked<Repository<T>>,
  method: keyof Repository<T>,
  criteria?: any
) {
  if (criteria) {
    expect(repository[method]).toHaveBeenCalledWith(expect.objectContaining(criteria));
  } else {
    expect(repository[method]).toHaveBeenCalled();
  }
}

/**
 * Verify repository save was called with entity matching partial
 */
export function expectRepositorySavedWith<T>(
  repository: DeepMocked<Repository<T>>,
  partial: Partial<T>
) {
  expect(repository.save).toHaveBeenCalledWith(expect.objectContaining(partial));
}

/**
 * Reset all repository mock calls
 */
export function resetRepositoryMocks<T>(repository: DeepMocked<Repository<T>>) {
  Object.values(repository).forEach((value) => {
    if (typeof value === 'function' && 'mockClear' in value) {
      (value as jest.Mock).mockClear();
    }
  });
}
