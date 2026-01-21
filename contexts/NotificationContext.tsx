import { createContext, useContext, useEffect, useCallback, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { useNotificationSettings } from './NotificationSettingsContext';
import {
    requestNotificationPermissions,
    scheduleAllHeatNotifications,
    cancelAllHeatNotifications,
    topUpNotificationQueue,
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

    // Track if we've done initial setup
    const initialSetupDoneRef = useRef(false);

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

        // Schedule notifications with all settings
        const { hour, minute } = settings.notificationTime;
        const { heatNotificationCount, heatNotificationInterval } = settings;
        await scheduleAllHeatNotifications(
            db,
            hour,
            minute,
            heatNotificationCount,
            heatNotificationInterval
        );
    }, [db, settings]);

    // Handle app state changes for top-up
    const handleAppStateChange = useCallback(async (nextAppState: AppStateStatus) => {
        if (nextAppState === 'active' && settings.heatNotificationsEnabled && initialSetupDoneRef.current) {
            console.log('[NotificationContext] App became active, topping up notification queue');
            const { hour, minute } = settings.notificationTime;
            const { heatNotificationCount, heatNotificationInterval } = settings;
            await topUpNotificationQueue(
                db,
                hour,
                minute,
                heatNotificationCount,
                heatNotificationInterval
            );
        }
    }, [db, settings]);

    // Set up AppState listener for top-up
    useEffect(() => {
        const subscription = AppState.addEventListener('change', handleAppStateChange);
        return () => {
            subscription.remove();
        };
    }, [handleAppStateChange]);

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
            prevSettings.notificationTime.minute !== settings.notificationTime.minute ||
            prevSettings.heatNotificationCount !== settings.heatNotificationCount ||
            prevSettings.heatNotificationInterval !== settings.heatNotificationInterval;

        if (settingsChanged) {
            console.log('[NotificationContext] Settings changed, rescheduling notifications');
            prevSettingsRef.current = settings;
            rescheduleHeatNotifications().then(() => {
                initialSetupDoneRef.current = true;
            });
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
