import { createContext, useContext, useEffect, useCallback, useRef } from 'react';
import { useSQLiteContext } from 'expo-sqlite';
import { useNotificationSettings } from './NotificationSettingsContext';
import {
    requestNotificationPermissions,
    scheduleAllHeatNotifications,
    cancelAllHeatNotifications,
} from '@/services/HeatNotificationService';

export interface NotificationContextType {
    rescheduleHeatNotifications: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType>({
    rescheduleHeatNotifications: async () => {},
});

export const useNotification = () => useContext(NotificationContext);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    console.log('[NotificationContext] Provider mounting');

    const db = useSQLiteContext();
    const { settings, isLoading } = useNotificationSettings();

    // Track previous settings to detect changes
    const prevSettingsRef = useRef<typeof settings | null>(null);

    // Core function to reschedule notifications
    const rescheduleHeatNotifications = useCallback(async () => {
        console.log('[NotificationContext] rescheduleHeatNotifications called');
        console.log('[NotificationContext] Current settings:', settings);

        if (!settings.heatNotificationsEnabled) {
            console.log('[NotificationContext] Notifications disabled, cancelling all');
            await cancelAllHeatNotifications();
            return;
        }

        // Request permissions if needed
        const hasPermission = await requestNotificationPermissions();
        if (!hasPermission) {
            console.log('[NotificationContext] No permission, cannot schedule notifications');
            return;
        }

        // Schedule notifications
        const { hour, minute } = settings.notificationTime;
        await scheduleAllHeatNotifications(db, hour, minute);
    }, [db, settings]);

    // Request permissions and set up initial notifications on mount
    useEffect(() => {
        if (isLoading) {
            console.log('[NotificationContext] Settings still loading, waiting...');
            return;
        }

        console.log('[NotificationContext] Settings loaded, checking if reschedule needed');

        // Only reschedule if settings have actually changed
        const prevSettings = prevSettingsRef.current;
        const settingsChanged = !prevSettings ||
            prevSettings.heatNotificationsEnabled !== settings.heatNotificationsEnabled ||
            prevSettings.notificationTime.hour !== settings.notificationTime.hour ||
            prevSettings.notificationTime.minute !== settings.notificationTime.minute;

        if (settingsChanged) {
            console.log('[NotificationContext] Settings changed, rescheduling notifications');
            prevSettingsRef.current = settings;
            rescheduleHeatNotifications();
        }
    }, [settings, isLoading, rescheduleHeatNotifications]);

    return (
        <NotificationContext.Provider
            value={{
                rescheduleHeatNotifications,
            }}
        >
            {children}
        </NotificationContext.Provider>
    );
};
