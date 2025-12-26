import { faker } from '@faker-js/faker';
import { Repository } from 'typeorm';

/**
 * Base fixture factory interface
 */
export interface FixtureFactory<T> {
  /**
   * Build a single entity (not saved to database)
   */
  build(overrides?: Partial<T>): T;

  /**
   * Build multiple entities (not saved to database)
   */
  buildMany(count: number, overrides?: Partial<T>): T[];

  /**
   * Create a single entity (saved to database)
   */
  create(repository: Repository<T>, overrides?: Partial<T>): Promise<T>;

  /**
   * Create multiple entities (saved to database)
   */
  createMany(repository: Repository<T>, count: number, overrides?: Partial<T>): Promise<T[]>;
}

/**
 * Abstract base fixture factory
 */
export abstract class BaseFixture<T> implements FixtureFactory<T> {
  /**
   * Reset faker seed for consistent test data
   */
  resetSeed(seed: number = 12345): void {
    faker.seed(seed);
  }

  /**
   * Generate default attributes for the entity
   */
  protected abstract defaults(): Partial<T>;

  /**
   * Build a single entity
   */
  build(overrides?: Partial<T>): T {
    const defaults = this.defaults();
    return { ...defaults, ...overrides } as T;
  }

  /**
   * Build multiple entities
   */
  buildMany(count: number, overrides?: Partial<T>): T[] {
    return Array.from({ length: count }, () => this.build(overrides));
  }

  /**
   * Create a single entity in the database
   */
  async create(repository: Repository<T>, overrides?: Partial<T>): Promise<T> {
    const entity = this.build(overrides);
    return repository.save(entity as any);
  }

  /**
   * Create multiple entities in the database
   */
  async createMany(
    repository: Repository<T>,
    count: number,
    overrides?: Partial<T>
  ): Promise<T[]> {
    const entities = this.buildMany(count, overrides);
    return repository.save(entities as any[]);
  }
}

/**
 * Faker utilities for common test data
 */
export const fixtures = {
  /**
   * Generate a random UUID
   */
  uuid: () => faker.string.uuid(),

  /**
   * Generate a random email
   */
  email: () => faker.internet.email().toLowerCase(),

  /**
   * Generate a random name
   */
  name: () => faker.person.fullName(),

  /**
   * Generate a random first name
   */
  firstName: () => faker.person.firstName(),

  /**
   * Generate a random last name
   */
  lastName: () => faker.person.lastName(),

  /**
   * Generate a random username
   */
  username: () => faker.internet.userName().toLowerCase(),

  /**
   * Generate a random password
   */
  password: () => faker.internet.password({ length: 12 }),

  /**
   * Generate a random phone number
   */
  phone: () => faker.phone.number(),

  /**
   * Generate a random address
   */
  address: () => ({
    street: faker.location.streetAddress(),
    city: faker.location.city(),
    state: faker.location.state(),
    zipCode: faker.location.zipCode(),
    country: faker.location.country(),
  }),

  /**
   * Generate a random company name
   */
  company: () => faker.company.name(),

  /**
   * Generate a random job title
   */
  jobTitle: () => faker.person.jobTitle(),

  /**
   * Generate a random URL
   */
  url: () => faker.internet.url(),

  /**
   * Generate a random domain
   */
  domain: () => faker.internet.domainName(),

  /**
   * Generate a random IP address
   */
  ip: () => faker.internet.ip(),

  /**
   * Generate a random user agent
   */
  userAgent: () => faker.internet.userAgent(),

  /**
   * Generate a random sentence
   */
  sentence: () => faker.lorem.sentence(),

  /**
   * Generate a random paragraph
   */
  paragraph: () => faker.lorem.paragraph(),

  /**
   * Generate random text
   */
  text: (length: number = 100) => faker.lorem.text().substring(0, length),

  /**
   * Generate a random number
   */
  number: (min: number = 0, max: number = 100) => faker.number.int({ min, max }),

  /**
   * Generate a random float
   */
  float: (min: number = 0, max: number = 100, precision: number = 2) =>
    faker.number.float({ min, max, fractionDigits: precision }),

  /**
   * Generate a random boolean
   */
  boolean: () => faker.datatype.boolean(),

  /**
   * Generate a random date in the past
   */
  pastDate: (years: number = 1) => faker.date.past({ years }),

  /**
   * Generate a random date in the future
   */
  futureDate: (years: number = 1) => faker.date.future({ years }),

  /**
   * Generate a random date between two dates
   */
  dateBetween: (from: Date, to: Date) => faker.date.between({ from, to }),

  /**
   * Generate a random color
   */
  color: () => faker.color.human(),

  /**
   * Generate a random hex color
   */
  hexColor: () => faker.color.rgb(),

  /**
   * Pick a random element from an array
   */
  pick: <T>(array: T[]): T => faker.helpers.arrayElement(array),

  /**
   * Pick multiple random elements from an array
   */
  pickMany: <T>(array: T[], count: number): T[] => faker.helpers.arrayElements(array, count),

  /**
   * Shuffle an array
   */
  shuffle: <T>(array: T[]): T[] => faker.helpers.shuffle(array),
};
