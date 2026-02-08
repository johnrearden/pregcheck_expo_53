// Mock native modules before imports
jest.mock('expo-notifications', () => ({
    setNotificationHandler: jest.fn(),
    getPermissionsAsync: jest.fn(),
    requestPermissionsAsync: jest.fn(),
    setNotificationChannelAsync: jest.fn(),
    getAllScheduledNotificationsAsync: jest.fn(() => Promise.resolve([])),
    cancelScheduledNotificationAsync: jest.fn(),
    scheduleNotificationAsync: jest.fn(),
    AndroidImportance: { HIGH: 4 },
    AndroidNotificationPriority: { HIGH: 'high' },
    SchedulableTriggerInputTypes: { DATE: 'date' },
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
    getItem: jest.fn(() => Promise.resolve(null)),
    setItem: jest.fn(() => Promise.resolve()),
}));

jest.mock('@/utilities/DatabaseUtils', () => ({
    getAllHeatRecords: jest.fn(() => Promise.resolve([])),
}));

import {
    generateAllNotificationDates,
    groupEntriesByDate,
    buildMultiNotificationBody,
    NotificationScheduleEntry,
} from '../HeatNotificationService';
import { HeatRecordType } from '@/contexts/HeatRecordContext';

// Helper to create mock heat records
const createMockHeatRecord = (overrides: Partial<HeatRecordType> = {}): HeatRecordType => ({
    device_pk: 1,
    device_session_pk: 1,
    server_pk: undefined,
    owner: 1,
    tag: 'TEST001',
    heat_date: '2026-01-01',
    next_heat_date: '2026-01-21',
    note: '',
    created_at: '2026-01-01T00:00:00.000Z',
    ...overrides,
});

// Helper to get a future date string
const getFutureDate = (daysFromNow: number): string => {
    const date = new Date();
    date.setDate(date.getDate() + daysFromNow);
    return date.toISOString().split('T')[0];
};

// Helper to add days to a date string (matches service logic: parses as UTC midnight)
const addDaysToDateStr = (dateStr: string, days: number): string => {
    const date = new Date(dateStr);
    date.setDate(date.getDate() + days);
    return date.toISOString().split('T')[0];
};

describe('HeatNotificationService', () => {
    describe('generateAllNotificationDates', () => {
        it('generates correct number of entries per record', () => {
            // Use future date to ensure notifications aren't filtered out as past
            const heatDate = getFutureDate(-5); // 5 days ago, so +20 days is still in future
            const records = [createMockHeatRecord({ tag: '123', heat_date: heatDate })];

            const entries = generateAllNotificationDates(records, 3, 20);

            // Should have 3 entries (one for each notification)
            expect(entries.length).toBe(3);
        });

        it('calculates correct notification dates based on interval', () => {
            const heatDate = getFutureDate(-5);
            const records = [createMockHeatRecord({ tag: '123', heat_date: heatDate })];

            const entries = generateAllNotificationDates(records, 3, 20);

            // Calculate expected dates from the heatDate string (avoids timezone drift)
            const expectedDate1 = addDaysToDateStr(heatDate, 20);
            const expectedDate2 = addDaysToDateStr(heatDate, 40);
            const expectedDate3 = addDaysToDateStr(heatDate, 60);

            expect(entries[0].notificationDate).toBe(expectedDate1);
            expect(entries[1].notificationDate).toBe(expectedDate2);
            expect(entries[2].notificationDate).toBe(expectedDate3);
        });

        it('skips past notification dates', () => {
            // Record with heat_date 90 days ago - all notifications would be in past
            const oldHeatDate = getFutureDate(-90);
            const records = [createMockHeatRecord({ heat_date: oldHeatDate })];

            const entries = generateAllNotificationDates(records, 3, 20);

            // All notification dates (day 20, 40, 60) would be in the past
            expect(entries.length).toBe(0);
        });

        it('partially includes future notifications for older records', () => {
            // Heat date was 50 days ago
            // Day 20: 30 days ago (past, skip)
            // Day 40: 10 days ago (past, skip)
            // Day 60: 10 days from now (future, include)
            const heatDate = getFutureDate(-50);
            const records = [createMockHeatRecord({ heat_date: heatDate })];

            const entries = generateAllNotificationDates(records, 3, 20);

            // Only the 3rd notification should be included
            expect(entries.length).toBe(1);
            expect(entries[0].notificationNumber).toBe(3);
        });

        it('handles multiple records correctly', () => {
            const heatDate = getFutureDate(-5);
            const records = [
                createMockHeatRecord({ tag: '123', heat_date: heatDate }),
                createMockHeatRecord({ tag: '456', heat_date: heatDate }),
            ];

            const entries = generateAllNotificationDates(records, 3, 20);

            // 2 records x 3 notifications each = 6 entries
            expect(entries.length).toBe(6);
        });

        it('respects custom notification count', () => {
            const heatDate = getFutureDate(-5);
            const records = [createMockHeatRecord({ tag: '123', heat_date: heatDate })];

            const entries = generateAllNotificationDates(records, 5, 20);

            expect(entries.length).toBe(5);
        });

        it('respects custom interval days', () => {
            const heatDate = getFutureDate(-5);
            const records = [createMockHeatRecord({ heat_date: heatDate })];

            const entries = generateAllNotificationDates(records, 2, 21);

            // Day 21 and day 42 from heat date
            const expectedDate1 = addDaysToDateStr(heatDate, 21);
            const expectedDate2 = addDaysToDateStr(heatDate, 42);

            expect(entries[0].notificationDate).toBe(expectedDate1);
            expect(entries[1].notificationDate).toBe(expectedDate2);
        });

        it('skips records without tag', () => {
            const heatDate = getFutureDate(-5);
            const records = [createMockHeatRecord({ tag: '', heat_date: heatDate })];

            const entries = generateAllNotificationDates(records, 3, 20);

            expect(entries.length).toBe(0);
        });

        it('skips records without heat_date', () => {
            const records = [createMockHeatRecord({ tag: '123', heat_date: '' })];

            const entries = generateAllNotificationDates(records, 3, 20);

            expect(entries.length).toBe(0);
        });

        it('sorts entries by date (nearest first)', () => {
            const earlyDate = getFutureDate(0); // today
            const lateDate = getFutureDate(10); // 10 days from now
            const records = [
                createMockHeatRecord({ tag: 'LATE', heat_date: lateDate }),
                createMockHeatRecord({ tag: 'EARLY', heat_date: earlyDate }),
            ];

            const entries = generateAllNotificationDates(records, 1, 20);

            // EARLY's notification (day 20) should come before LATE's (day 30)
            expect(entries[0].animalTag).toBe('EARLY');
            expect(entries[1].animalTag).toBe('LATE');
        });

        it('includes notificationNumber in entries', () => {
            const heatDate = getFutureDate(-5);
            const records = [createMockHeatRecord({ tag: '123', heat_date: heatDate })];

            const entries = generateAllNotificationDates(records, 3, 20);

            expect(entries[0].notificationNumber).toBe(1);
            expect(entries[1].notificationNumber).toBe(2);
            expect(entries[2].notificationNumber).toBe(3);
        });
    });

    describe('groupEntriesByDate', () => {
        it('groups entries with same notification date', () => {
            const entries: NotificationScheduleEntry[] = [
                { notificationDate: '2026-01-21', animalTag: '123', heatDate: '2026-01-01', notificationNumber: 1 },
                { notificationDate: '2026-01-21', animalTag: '456', heatDate: '2026-01-01', notificationNumber: 1 },
                { notificationDate: '2026-02-10', animalTag: '123', heatDate: '2026-01-01', notificationNumber: 2 },
            ];

            const grouped = groupEntriesByDate(entries);

            expect(grouped.size).toBe(2);
            expect(grouped.get('2026-01-21')?.length).toBe(2);
            expect(grouped.get('2026-02-10')?.length).toBe(1);
        });

        it('handles empty array', () => {
            const entries: NotificationScheduleEntry[] = [];

            const grouped = groupEntriesByDate(entries);

            expect(grouped.size).toBe(0);
        });

        it('handles single entry', () => {
            const entries: NotificationScheduleEntry[] = [
                { notificationDate: '2026-01-21', animalTag: '123', heatDate: '2026-01-01', notificationNumber: 1 },
            ];

            const grouped = groupEntriesByDate(entries);

            expect(grouped.size).toBe(1);
            expect(grouped.get('2026-01-21')?.length).toBe(1);
        });

        it('preserves entry data in groups', () => {
            const entries: NotificationScheduleEntry[] = [
                { notificationDate: '2026-01-21', animalTag: 'TAG123', heatDate: '2026-01-01', notificationNumber: 1 },
            ];

            const grouped = groupEntriesByDate(entries);
            const entry = grouped.get('2026-01-21')?.[0];

            expect(entry?.animalTag).toBe('TAG123');
            expect(entry?.heatDate).toBe('2026-01-01');
            expect(entry?.notificationNumber).toBe(1);
        });
    });

    describe('buildMultiNotificationBody', () => {
        it('formats single animal correctly', () => {
            const entries: NotificationScheduleEntry[] = [
                { notificationDate: '2026-01-21', animalTag: '123', heatDate: '2026-01-01', notificationNumber: 1 },
            ];

            const body = buildMultiNotificationBody(entries);

            expect(body).toBe('Heat check due: 123');
        });

        it('formats two animals correctly', () => {
            const entries: NotificationScheduleEntry[] = [
                { notificationDate: '2026-01-21', animalTag: '123', heatDate: '2026-01-01', notificationNumber: 1 },
                { notificationDate: '2026-01-21', animalTag: '456', heatDate: '2026-01-01', notificationNumber: 1 },
            ];

            const body = buildMultiNotificationBody(entries);

            expect(body).toBe('Heat check due: 123, 456');
        });

        it('formats up to 5 animals correctly', () => {
            const entries: NotificationScheduleEntry[] = [
                { notificationDate: '2026-01-21', animalTag: '1', heatDate: '2026-01-01', notificationNumber: 1 },
                { notificationDate: '2026-01-21', animalTag: '2', heatDate: '2026-01-01', notificationNumber: 1 },
                { notificationDate: '2026-01-21', animalTag: '3', heatDate: '2026-01-01', notificationNumber: 1 },
                { notificationDate: '2026-01-21', animalTag: '4', heatDate: '2026-01-01', notificationNumber: 1 },
                { notificationDate: '2026-01-21', animalTag: '5', heatDate: '2026-01-01', notificationNumber: 1 },
            ];

            const body = buildMultiNotificationBody(entries);

            expect(body).toBe('Heat check due: 1, 2, 3, 4, 5');
        });

        it('truncates long lists with count', () => {
            const entries: NotificationScheduleEntry[] = Array.from({ length: 8 }, (_, i) => ({
                notificationDate: '2026-01-21',
                animalTag: String(i + 1),
                heatDate: '2026-01-01',
                notificationNumber: 1,
            }));

            const body = buildMultiNotificationBody(entries);

            expect(body).toContain('and 3 more');
            expect(body).toBe('Heat check due: 1, 2, 3, 4, 5 and 3 more');
        });

        it('handles empty entries array', () => {
            const entries: NotificationScheduleEntry[] = [];

            const body = buildMultiNotificationBody(entries);

            expect(body).toBe('Heat check due today.');
        });

        it('filters out empty tags', () => {
            const entries: NotificationScheduleEntry[] = [
                { notificationDate: '2026-01-21', animalTag: '123', heatDate: '2026-01-01', notificationNumber: 1 },
                { notificationDate: '2026-01-21', animalTag: '', heatDate: '2026-01-01', notificationNumber: 1 },
                { notificationDate: '2026-01-21', animalTag: '456', heatDate: '2026-01-01', notificationNumber: 1 },
            ];

            const body = buildMultiNotificationBody(entries);

            expect(body).toBe('Heat check due: 123, 456');
        });
    });
});
