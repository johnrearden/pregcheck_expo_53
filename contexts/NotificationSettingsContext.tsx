import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NOTIFICATION_SETTINGS_KEY } from '@/constants/asyncStorageKeys';

export interface NotificationTime {
    hour: number;
    minute: number;
}

export interface NotificationSettings {
    heatNotificationsEnabled: boolean;
    notificationTime: NotificationTime;
}

export interface NotificationSettingsContextType {
    settings: NotificationSettings;
    isLoading: boolean;
    setHeatNotificationsEnabled: (enabled: boolean) => Promise<void>;
    setNotificationTime: (time: NotificationTime) => Promise<void>;
}

const DEFAULT_SETTINGS: NotificationSettings = {
    heatNotificationsEnabled: false,
    notificationTime: { hour: 7, minute: 0 },
};

const NotificationSettingsContext = createContext<NotificationSettingsContextType>({
    settings: DEFAULT_SETTINGS,
    isLoading: true,
    setHeatNotificationsEnabled: async () => {},
    setNotificationTime: async () => {},
});

export const useNotificationSettings = () => useContext(NotificationSettingsContext);

export const NotificationSettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    console.log('[NotificationSettingsContext] Provider mounting');

    const [settings, setSettings] = useState<NotificationSettings>(DEFAULT_SETTINGS);
    const [isLoading, setIsLoading] = useState<boolean>(true);

    // Load settings from AsyncStorage on mount
    useEffect(() => {
        const loadSettings = async () => {
            console.log('[NotificationSettingsContext] Loading settings from storage...');
            try {
                const storedSettings = await AsyncStorage.getItem(NOTIFICATION_SETTINGS_KEY);
                if (storedSettings) {
                    const parsed = JSON.parse(storedSettings) as NotificationSettings;
                    console.log('[NotificationSettingsContext] Loaded settings:', parsed);
                    setSettings(parsed);
                } else {
                    console.log('[NotificationSettingsContext] No stored settings, using defaults');
                }
            } catch (error) {
                console.error('[NotificationSettingsContext] Error loading settings:', error);
            } finally {
                setIsLoading(false);
            }
        };
        loadSettings();
    }, []);

    // Save settings to AsyncStorage
    const saveSettings = useCallback(async (newSettings: NotificationSettings) => {
        console.log('[NotificationSettingsContext] Saving settings:', newSettings);
        try {
            await AsyncStorage.setItem(NOTIFICATION_SETTINGS_KEY, JSON.stringify(newSettings));
            setSettings(newSettings);
            console.log('[NotificationSettingsContext] Settings saved successfully');
        } catch (error) {
            console.error('[NotificationSettingsContext] Error saving settings:', error);
            throw error;
        }
    }, []);

    // Update heat notifications enabled setting
    const setHeatNotificationsEnabled = useCallback(async (enabled: boolean) => {
        console.log('[NotificationSettingsContext] Setting heat notifications enabled:', enabled);
        const newSettings = { ...settings, heatNotificationsEnabled: enabled };
        await saveSettings(newSettings);
    }, [settings, saveSettings]);

    // Update notification time setting
    const setNotificationTime = useCallback(async (time: NotificationTime) => {
        console.log('[NotificationSettingsContext] Setting notification time:', time);
        const newSettings = { ...settings, notificationTime: time };
        await saveSettings(newSettings);
    }, [settings, saveSettings]);

    return (
        <NotificationSettingsContext.Provider
            value={{
                settings,
                isLoading,
                setHeatNotificationsEnabled,
                setNotificationTime,
            }}
        >
            {children}
        </NotificationSettingsContext.Provider>
    );
};
