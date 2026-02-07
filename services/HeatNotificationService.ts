import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import * as SQLite from 'expo-sqlite';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getAllHeatRecords } from '@/utilities/DatabaseUtils';
import { HeatRecordType } from '@/contexts/HeatRecordContext';
import { HEAT_NOTIFICATION_SCHEDULE_KEY } from '@/constants/asyncStorageKeys';

// Channel ID for heat notifications (Android)
const HEAT_NOTIFICATION_CHANNEL_ID = 'heat-notifications';

// Prefix for heat notification identifiers
const HEAT_NOTIFICATION_PREFIX = 'heat-';

// iOS notification limits
const IOS_NOTIFICATION_LIMIT = 64;
const SAFE_NOTIFICATION_LIMIT = 50; // Leave headroom below iOS limit

// Default multi-notification settings
const DEFAULT_NOTIFICATION_COUNT = 3;
const DEFAULT_INTERVAL_DAYS = 20;
const SCHEDULING_WINDOW_DAYS = 90;

// Type for notification schedule entry
export interface NotificationScheduleEntry {
    notificationDate: string; // YYYY-MM-DD
    animalTag: string;
    heatDate: string; // Original heat_date
    notificationNumber: number; // 1, 2, 3, etc.
}

// Type for stored schedule
export interface StoredSchedule {
    entries: NotificationScheduleEntry[];
    lastUpdated: string;
}

/**
 * Configure notification handling
 */
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
    }),
});

/**
 * Request notification permissions from the user
 * @returns true if permissions were granted, false otherwise
 */
export const requestNotificationPermissions = async (): Promise<boolean> => {
    console.log('[HeatNotificationService] Requesting notification permissions...');

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    console.log('[HeatNotificationService] Existing permission status:', existingStatus);

    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
        console.log('[HeatNotificationService] Permission request result:', status);
    }

    if (finalStatus !== 'granted') {
        console.log('[HeatNotificationService] Permission not granted');
        return false;
    }

    // Set up Android notification channel
    if (Platform.OS === 'android') {
        await setupAndroidNotificationChannel();
    }

    console.log('[HeatNotificationService] Permissions granted');
    return true;
};

/**
 * Set up Android notification channel for heat notifications
 */
const setupAndroidNotificationChannel = async () => {
    await Notifications.setNotificationChannelAsync(HEAT_NOTIFICATION_CHANNEL_ID, {
        name: 'Heat Notifications',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
        description: 'Notifications for animals coming into heat',
    });
    console.log('[HeatNotificationService] Android notification channel set up');
};

/**
 * Cancel all scheduled heat notifications
 */
export const cancelAllHeatNotifications = async (): Promise<void> => {
    console.log('[HeatNotificationService] Cancelling all heat notifications...');

    try {
        const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();
        console.log('[HeatNotificationService] Found', scheduledNotifications.length, 'total scheduled notifications');

        let cancelledCount = 0;
        for (const notification of scheduledNotifications) {
            if (notification.identifier.startsWith(HEAT_NOTIFICATION_PREFIX)) {
                await Notifications.cancelScheduledNotificationAsync(notification.identifier);
                cancelledCount++;
            }
        }

        console.log('[HeatNotificationService] Cancelled', cancelledCount, 'heat notifications');
    } catch (error) {
        console.error('[HeatNotificationService] Error cancelling notifications:', error);
    }
};

/**
 * Format a date as YYYY-MM-DD string
 */
const formatDateString = (date: Date): string => {
    return date.toISOString().split('T')[0];
};

/**
 * Add days to a date and return formatted string
 */
const addDays = (dateStr: string, days: number): string => {
    const date = new Date(dateStr);
    date.setDate(date.getDate() + days);
    return formatDateString(date);
};

/**
 * Generate all notification dates for heat records
 * @param records Heat records to generate notifications for
 * @param count Number of notifications per record
 * @param interval Days between notifications
 * @returns Array of notification schedule entries (only future dates)
 */
export const generateAllNotificationDates = (
    records: HeatRecordType[],
    count: number = DEFAULT_NOTIFICATION_COUNT,
    interval: number = DEFAULT_INTERVAL_DAYS
): NotificationScheduleEntry[] => {
    const entries: NotificationScheduleEntry[] = [];
    const today = formatDateString(new Date());

    for (const record of records) {
        if (!record.heat_date || !record.tag) continue;

        // Extract just the date portion (YYYY-MM-DD)
        const heatDate = record.heat_date.split('T')[0];

        // Generate notification dates at each interval
        for (let i = 1; i <= count; i++) {
            const daysFromHeat = interval * i;
            const notificationDate = addDays(heatDate, daysFromHeat);

            // Only include future notification dates
            if (notificationDate >= today) {
                entries.push({
                    notificationDate,
                    animalTag: record.tag,
                    heatDate,
                    notificationNumber: i,
                });
            }
        }
    }

    // Sort by date (nearest first)
    entries.sort((a, b) => a.notificationDate.localeCompare(b.notificationDate));

    return entries;
};

/**
 * Group notification entries by date
 */
export const groupEntriesByDate = (entries: NotificationScheduleEntry[]): Map<string, NotificationScheduleEntry[]> => {
    const grouped = new Map<string, NotificationScheduleEntry[]>();

    for (const entry of entries) {
        if (!grouped.has(entry.notificationDate)) {
            grouped.set(entry.notificationDate, []);
        }
        grouped.get(entry.notificationDate)!.push(entry);
    }

    return grouped;
};

/**
 * Build notification body text from entries
 * Simple format: "Heat check due: 123, 456, 789"
 */
export const buildMultiNotificationBody = (entries: NotificationScheduleEntry[]): string => {
    const tags = entries.map(e => e.animalTag).filter(Boolean);

    if (tags.length === 0) {
        return 'Heat check due today.';
    }

    if (tags.length === 1) {
        return `Heat check due: ${tags[0]}`;
    }

    if (tags.length <= 5) {
        return `Heat check due: ${tags.join(', ')}`;
    }

    // For more than 5 animals, truncate the list
    const displayedTags = tags.slice(0, 5);
    const remainingCount = tags.length - 5;
    return `Heat check due: ${displayedTags.join(', ')} and ${remainingCount} more`;
};

/**
 * Save the full notification schedule to AsyncStorage
 */
const saveSchedule = async (entries: NotificationScheduleEntry[]): Promise<void> => {
    try {
        const schedule: StoredSchedule = {
            entries,
            lastUpdated: new Date().toISOString(),
        };
        await AsyncStorage.setItem(HEAT_NOTIFICATION_SCHEDULE_KEY, JSON.stringify(schedule));
        console.log('[HeatNotificationService] Saved schedule with', entries.length, 'entries');
    } catch (error) {
        console.error('[HeatNotificationService] Error saving schedule:', error);
    }
};

/**
 * Load the notification schedule from AsyncStorage
 */
const loadSchedule = async (): Promise<StoredSchedule | null> => {
    try {
        const stored = await AsyncStorage.getItem(HEAT_NOTIFICATION_SCHEDULE_KEY);
        if (stored) {
            return JSON.parse(stored) as StoredSchedule;
        }
    } catch (error) {
        console.error('[HeatNotificationService] Error loading schedule:', error);
    }
    return null;
};

/**
 * Schedule all heat notifications for records in the database
 * @param db SQLite database instance
 * @param hour Hour of the day to fire notifications (0-23)
 * @param minute Minute of the hour to fire notifications (0-59)
 * @param count Number of notifications per heat record (default 3)
 * @param interval Days between notifications (default 20)
 */
export const scheduleAllHeatNotifications = async (
    db: SQLite.SQLiteDatabase,
    hour: number,
    minute: number,
    count: number = DEFAULT_NOTIFICATION_COUNT,
    interval: number = DEFAULT_INTERVAL_DAYS
): Promise<number> => {
    console.log('[HeatNotificationService] Scheduling heat notifications for', hour + ':' + minute);
    console.log('[HeatNotificationService] Settings: count=', count, 'interval=', interval);

    // First, cancel all existing heat notifications
    await cancelAllHeatNotifications();

    // Get all heat records from the database
    const records = await getAllHeatRecords(db);
    console.log('[HeatNotificationService] Found', records.length, 'total heat records');

    if (records.length === 0) {
        console.log('[HeatNotificationService] No heat records to schedule notifications for');
        await saveSchedule([]);
        return 0;
    }

    // Generate all notification dates
    const allEntries = generateAllNotificationDates(records, count, interval);
    console.log('[HeatNotificationService] Generated', allEntries.length, 'notification entries');

    // Save the full schedule for later top-up
    await saveSchedule(allEntries);

    // Group entries by date
    const entriesByDate = groupEntriesByDate(allEntries);
    console.log('[HeatNotificationService] Grouped into', entriesByDate.size, 'unique dates');

    // Determine how many notifications we can schedule
    // On iOS, limit to SAFE_NOTIFICATION_LIMIT; on Android, no limit
    const maxNotifications = Platform.OS === 'ios' ? SAFE_NOTIFICATION_LIMIT : entriesByDate.size;

    let scheduledCount = 0;
    const sortedDates = Array.from(entriesByDate.keys()).sort();

    // Schedule notifications for each date (up to the limit)
    for (const dateStr of sortedDates) {
        if (scheduledCount >= maxNotifications) {
            console.log('[HeatNotificationService] Reached notification limit (', maxNotifications, ')');
            break;
        }

        const dateEntries = entriesByDate.get(dateStr)!;

        try {
            // Parse the date and set the notification time
            const [year, month, day] = dateStr.split('-').map(Number);
            const notificationDate = new Date(year, month - 1, day, hour, minute, 0);

            // Skip if the notification time is in the past
            if (notificationDate <= new Date()) {
                console.log('[HeatNotificationService] Skipping past date:', dateStr);
                continue;
            }

            const body = buildMultiNotificationBody(dateEntries);
            const identifier = `${HEAT_NOTIFICATION_PREFIX}${dateStr}`;

            await Notifications.scheduleNotificationAsync({
                identifier,
                content: {
                    title: 'Heat Alert',
                    body,
                    sound: true,
                    priority: Notifications.AndroidNotificationPriority.HIGH,
                    ...(Platform.OS === 'android' && {
                        channelId: HEAT_NOTIFICATION_CHANNEL_ID,
                    }),
                },
                trigger: {
                    type: Notifications.SchedulableTriggerInputTypes.DATE,
                    date: notificationDate,
                },
            });

            scheduledCount++;
            console.log('[HeatNotificationService] Scheduled notification for', dateStr, 'with', dateEntries.length, 'animals');
        } catch (error) {
            console.error('[HeatNotificationService] Error scheduling notification for', dateStr, ':', error);
        }
    }

    console.log('[HeatNotificationService] Successfully scheduled', scheduledCount, 'notifications');
    return scheduledCount;
};

/**
 * Top up the notification queue on app resume
 * Fills vacated slots with upcoming notifications from the stored schedule
 * @param db SQLite database instance
 * @param hour Hour of the day to fire notifications (0-23)
 * @param minute Minute of the hour to fire notifications (0-59)
 * @param count Number of notifications per heat record
 * @param interval Days between notifications
 */
export const topUpNotificationQueue = async (
    db: SQLite.SQLiteDatabase,
    hour: number,
    minute: number,
    count: number = DEFAULT_NOTIFICATION_COUNT,
    interval: number = DEFAULT_INTERVAL_DAYS
): Promise<number> => {
    console.log('[HeatNotificationService] Top-up: Checking notification queue...');

    // Get currently scheduled notifications
    const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();
    const heatNotifications = scheduledNotifications.filter(n =>
        n.identifier.startsWith(HEAT_NOTIFICATION_PREFIX)
    );
    const currentCount = heatNotifications.length;
    console.log('[HeatNotificationService] Top-up: Currently', currentCount, 'notifications scheduled');

    // On iOS, check if we have room for more
    if (Platform.OS === 'ios' && currentCount >= SAFE_NOTIFICATION_LIMIT) {
        console.log('[HeatNotificationService] Top-up: At limit, no top-up needed');
        return 0;
    }

    // Load the stored schedule
    const storedSchedule = await loadSchedule();
    if (!storedSchedule || storedSchedule.entries.length === 0) {
        console.log('[HeatNotificationService] Top-up: No stored schedule, regenerating...');
        // No stored schedule, regenerate everything
        return scheduleAllHeatNotifications(db, hour, minute, count, interval);
    }

    // Get the dates that are already scheduled
    const scheduledDates = new Set(heatNotifications.map(n =>
        n.identifier.replace(HEAT_NOTIFICATION_PREFIX, '')
    ));

    // Filter to entries that haven't been scheduled yet
    const today = formatDateString(new Date());
    const unscheduledEntries = storedSchedule.entries.filter(entry =>
        entry.notificationDate >= today && !scheduledDates.has(entry.notificationDate)
    );

    if (unscheduledEntries.length === 0) {
        console.log('[HeatNotificationService] Top-up: No unscheduled entries to add');
        return 0;
    }

    // Group unscheduled entries by date
    const entriesByDate = groupEntriesByDate(unscheduledEntries);

    // Determine how many slots are available
    const availableSlots = Platform.OS === 'ios'
        ? SAFE_NOTIFICATION_LIMIT - currentCount
        : entriesByDate.size;

    let addedCount = 0;
    const sortedDates = Array.from(entriesByDate.keys()).sort();

    for (const dateStr of sortedDates) {
        if (addedCount >= availableSlots) {
            break;
        }

        const dateEntries = entriesByDate.get(dateStr)!;

        try {
            const [year, month, day] = dateStr.split('-').map(Number);
            const notificationDate = new Date(year, month - 1, day, hour, minute, 0);

            if (notificationDate <= new Date()) {
                continue;
            }

            const body = buildMultiNotificationBody(dateEntries);
            const identifier = `${HEAT_NOTIFICATION_PREFIX}${dateStr}`;

            await Notifications.scheduleNotificationAsync({
                identifier,
                content: {
                    title: 'Heat Alert',
                    body,
                    sound: true,
                    priority: Notifications.AndroidNotificationPriority.HIGH,
                    ...(Platform.OS === 'android' && {
                        channelId: HEAT_NOTIFICATION_CHANNEL_ID,
                    }),
                },
                trigger: {
                    type: Notifications.SchedulableTriggerInputTypes.DATE,
                    date: notificationDate,
                },
            });

            addedCount++;
            console.log('[HeatNotificationService] Top-up: Added notification for', dateStr);
        } catch (error) {
            console.error('[HeatNotificationService] Top-up: Error scheduling for', dateStr, ':', error);
        }
    }

    console.log('[HeatNotificationService] Top-up: Added', addedCount, 'notifications');
    return addedCount;
};

/**
 * Get count of scheduled heat notifications
 * @returns Number of scheduled heat notifications
 */
export const getScheduledHeatNotificationCount = async (): Promise<number> => {
    try {
        const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();
        const heatNotifications = scheduledNotifications.filter(n =>
            n.identifier.startsWith(HEAT_NOTIFICATION_PREFIX)
        );
        return heatNotifications.length;
    } catch (error) {
        console.error('[HeatNotificationService] Error getting notification count:', error);
        return 0;
    }
};

/**
 * Get all scheduled heat notifications with full details
 * @returns Array of scheduled heat notification objects
 */
export const getAllScheduledHeatNotifications = async (): Promise<Notifications.NotificationRequest[]> => {
    try {
        const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();
        const heatNotifications = scheduledNotifications.filter(n =>
            n.identifier.startsWith(HEAT_NOTIFICATION_PREFIX)
        );
        // Sort by identifier (which contains the date)
        heatNotifications.sort((a, b) => a.identifier.localeCompare(b.identifier));
        return heatNotifications;
    } catch (error) {
        console.error('[HeatNotificationService] Error getting scheduled notifications:', error);
        return [];
    }
};

/**
 * Get the stored notification schedule
 * @returns The stored schedule or null if not found
 */
export const getStoredSchedule = async (): Promise<StoredSchedule | null> => {
    return loadSchedule();
};
