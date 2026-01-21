import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import * as SQLite from 'expo-sqlite';
import { getHeatRecordsForDateRange } from '@/utilities/DatabaseUtils';
import { HeatRecordType } from '@/contexts/HeatRecordContext';

// Channel ID for heat notifications (Android)
const HEAT_NOTIFICATION_CHANNEL_ID = 'heat-notifications';

// Prefix for heat notification identifiers
const HEAT_NOTIFICATION_PREFIX = 'heat-';

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
 * Group heat records by their next_heat_date
 */
const groupRecordsByDate = (records: HeatRecordType[]): Map<string, HeatRecordType[]> => {
    const grouped = new Map<string, HeatRecordType[]>();

    for (const record of records) {
        if (!record.next_heat_date) continue;

        // Extract just the date portion (YYYY-MM-DD)
        const dateKey = record.next_heat_date.split('T')[0];

        if (!grouped.has(dateKey)) {
            grouped.set(dateKey, []);
        }
        grouped.get(dateKey)!.push(record);
    }

    return grouped;
};

/**
 * Build notification body text from heat records
 */
const buildNotificationBody = (records: HeatRecordType[]): string => {
    const tags = records.map(r => r.tag).filter(Boolean);

    if (tags.length === 0) {
        return 'Some animals are expected to be in heat today.';
    }

    if (tags.length === 1) {
        return `Animal ${tags[0]} is expected to be in heat today.`;
    }

    if (tags.length <= 5) {
        return `Animals ${tags.join(', ')} are expected to be in heat today.`;
    }

    // For more than 5 animals, truncate the list
    const displayedTags = tags.slice(0, 5);
    const remainingCount = tags.length - 5;
    return `Animals ${displayedTags.join(', ')} and ${remainingCount} more are expected to be in heat today.`;
};

/**
 * Schedule all heat notifications for the next 30 days
 * @param db SQLite database instance
 * @param hour Hour of the day to fire notifications (0-23)
 * @param minute Minute of the hour to fire notifications (0-59)
 */
export const scheduleAllHeatNotifications = async (
    db: SQLite.SQLiteDatabase,
    hour: number,
    minute: number
): Promise<number> => {
    console.log('[HeatNotificationService] Scheduling heat notifications for', hour + ':' + minute);

    // First, cancel all existing heat notifications
    await cancelAllHeatNotifications();

    // Calculate date range (today to 30 days from now)
    const today = new Date();
    const endDate = new Date();
    endDate.setDate(today.getDate() + 30);

    const startDateStr = formatDateString(today);
    const endDateStr = formatDateString(endDate);

    console.log('[HeatNotificationService] Querying records from', startDateStr, 'to', endDateStr);

    // Get all heat records for the date range
    const records = await getHeatRecordsForDateRange(db, startDateStr, endDateStr);
    console.log('[HeatNotificationService] Found', records.length, 'records in date range');

    if (records.length === 0) {
        console.log('[HeatNotificationService] No heat records to schedule notifications for');
        return 0;
    }

    // Group records by date
    const recordsByDate = groupRecordsByDate(records);
    console.log('[HeatNotificationService] Grouped into', recordsByDate.size, 'unique dates');

    let scheduledCount = 0;

    // Schedule a notification for each date
    for (const [dateStr, dateRecords] of recordsByDate) {
        try {
            // Parse the date and set the notification time
            const [year, month, day] = dateStr.split('-').map(Number);
            const notificationDate = new Date(year, month - 1, day, hour, minute, 0);

            // Skip if the notification time is in the past
            if (notificationDate <= new Date()) {
                console.log('[HeatNotificationService] Skipping past date:', dateStr);
                continue;
            }

            const body = buildNotificationBody(dateRecords);
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
            console.log('[HeatNotificationService] Scheduled notification for', dateStr, 'with', dateRecords.length, 'animals');
        } catch (error) {
            console.error('[HeatNotificationService] Error scheduling notification for', dateStr, ':', error);
        }
    }

    console.log('[HeatNotificationService] Successfully scheduled', scheduledCount, 'notifications');
    return scheduledCount;
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
