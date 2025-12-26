import { Test, TestingModule } from '@nestjs/testing';
import { OvertimeCalculatorService } from '../overtime-calculator.service';
import { WorkerProfile } from '../../entities/worker-profile.entity';
import { TimeEntry } from '../../entities/time-entry.entity';
import { OvertimeRule, TimeEntryStatus, EmploymentType } from '../../enums/time-attendance.enum';

describe('OvertimeCalculatorService', () => {
  let service: OvertimeCalculatorService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [OvertimeCalculatorService],
    }).compile();

    service = module.get<OvertimeCalculatorService>(OvertimeCalculatorService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('calculateHours - STANDARD rule', () => {
    it('should calculate 40 regular hours for exactly 40 hours worked', () => {
      const workerProfile = createMockWorkerProfile(OvertimeRule.STANDARD);
      const entries = createMockTimeEntries(8, 5); // 8 hours/day for 5 days = 40 hours

      const result = service.calculateHours(workerProfile, entries, new Date('2024-12-16'));

      expect(result.regularHours).toBe(40);
      expect(result.overtimeHours).toBe(0);
      expect(result.doubleTimeHours).toBe(0);
    });

    it('should calculate overtime for hours over 40 per week', () => {
      const workerProfile = createMockWorkerProfile(OvertimeRule.STANDARD);
      const entries = createMockTimeEntries(10, 5); // 10 hours/day for 5 days = 50 hours

      const result = service.calculateHours(workerProfile, entries, new Date('2024-12-16'));

      expect(result.regularHours).toBe(40);
      expect(result.overtimeHours).toBe(10);
      expect(result.doubleTimeHours).toBe(0);
    });

    it('should handle zero hours worked', () => {
      const workerProfile = createMockWorkerProfile(OvertimeRule.STANDARD);
      const entries = createMockTimeEntries(0, 0);

      const result = service.calculateHours(workerProfile, entries, new Date('2024-12-16'));

      expect(result.regularHours).toBe(0);
      expect(result.overtimeHours).toBe(0);
      expect(result.doubleTimeHours).toBe(0);
    });
  });

  describe('calculateHours - CALIFORNIA rule', () => {
    it('should calculate OT for hours over 8 per day', () => {
      const workerProfile = createMockWorkerProfile(OvertimeRule.CALIFORNIA);
      // One day with 10 hours (8 regular + 2 OT)
      const entries = createMockTimeEntries(10, 1);

      const result = service.calculateHours(workerProfile, entries, new Date('2024-12-16'));

      expect(result.regularHours).toBe(8);
      expect(result.overtimeHours).toBe(2);
      expect(result.doubleTimeHours).toBe(0);
    });

    it('should calculate DT for hours over 12 per day', () => {
      const workerProfile = createMockWorkerProfile(OvertimeRule.CALIFORNIA);
      // One day with 14 hours (8 regular + 4 OT + 2 DT)
      const entries = createMockTimeEntries(14, 1);

      const result = service.calculateHours(workerProfile, entries, new Date('2024-12-16'));

      expect(result.regularHours).toBe(8);
      expect(result.overtimeHours).toBe(4);
      expect(result.doubleTimeHours).toBe(2);
    });

    it('should apply 7th consecutive day rule', () => {
      const workerProfile = createMockWorkerProfile(OvertimeRule.CALIFORNIA);
      // 7 days with 8 hours each (last day should be all double-time)
      const entries = createMockTimeEntries(8, 7);

      const result = service.calculateHours(workerProfile, entries, new Date('2024-12-16'));

      // First 6 days: 6 * 8 = 48 regular hours
      // 7th day: 8 DT hours
      expect(result.regularHours).toBe(48);
      expect(result.overtimeHours).toBe(0);
      expect(result.doubleTimeHours).toBe(8);
    });
  });

  describe('calculateHours - Edge cases', () => {
    it('should handle fractional hours correctly', () => {
      const workerProfile = createMockWorkerProfile(OvertimeRule.STANDARD);
      const entries = [createMockTimeEntry(new Date(), 8.5)];

      const result = service.calculateHours(workerProfile, entries, new Date('2024-12-16'));

      expect(result.regularHours).toBe(8.5);
      expect(result.overtimeHours).toBe(0);
    });

    it('should handle negative hours as zero', () => {
      const workerProfile = createMockWorkerProfile(OvertimeRule.STANDARD);
      const entries = [createMockTimeEntry(new Date(), -5)];

      const result = service.calculateHours(workerProfile, entries, new Date('2024-12-16'));

      expect(result.regularHours).toBe(0);
      expect(result.overtimeHours).toBe(0);
      expect(result.doubleTimeHours).toBe(0);
    });
  });
});

// Helper functions
function createMockWorkerProfile(overtimeRule: OvertimeRule): Partial<WorkerProfile> {
  return {
    id: '123',
    userId: 'user-123',
    overtimeRule,
    hourlyRate: 25,
    trade: 'Carpenter',
    employmentType: EmploymentType.DIRECT_EMPLOYEE,
  } as WorkerProfile;
}

function createMockTimeEntries(hoursPerDay: number, days: number): Partial<TimeEntry>[] {
  const entries: Partial<TimeEntry>[] = [];
  const startDate = new Date('2024-12-16'); // Monday

  for (let i = 0; i < days; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    entries.push(createMockTimeEntry(date, hoursPerDay));
  }

  return entries;
}

function createMockTimeEntry(date: Date, hours: number): Partial<TimeEntry> {
  return {
    id: `entry-${date.toISOString()}`,
    entryDate: date,
    totalHoursWorked: hours,
    regularHours: 0,
    overtimeHours: 0,
    doubleTimeHours: 0,
    status: TimeEntryStatus.DRAFT,
  } as TimeEntry;
}
