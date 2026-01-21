import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
    NotificationSettingsProvider,
    useNotificationSettings,
    NotificationSettings,
} from '../NotificationSettingsContext';
import { NOTIFICATION_SETTINGS_KEY } from '@/constants/asyncStorageKeys';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
    getItem: jest.fn(),
    setItem: jest.fn(),
}));

const mockedAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;

// Wrapper component for testing
const wrapper = ({ children }: { children: React.ReactNode }) => (
    <NotificationSettingsProvider>{children}</NotificationSettingsProvider>
);

describe('NotificationSettingsContext', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockedAsyncStorage.getItem.mockResolvedValue(null);
        mockedAsyncStorage.setItem.mockResolvedValue();
    });

    describe('Default Values', () => {
        it('has correct default values for all settings', async () => {
            const { result } = renderHook(() => useNotificationSettings(), { wrapper });

            await waitFor(() => !result.current.isLoading);

            expect(result.current.settings.heatNotificationsEnabled).toBe(false);
            expect(result.current.settings.notificationTime.hour).toBe(7);
            expect(result.current.settings.notificationTime.minute).toBe(0);
            expect(result.current.settings.heatNotificationCount).toBe(3);
            expect(result.current.settings.heatNotificationInterval).toBe(20);
        });
    });

    describe('Settings Migration', () => {
        it('migrates old settings without new fields', async () => {
            // Simulate old settings format (without heatNotificationCount and heatNotificationInterval)
            const oldSettings = JSON.stringify({
                heatNotificationsEnabled: true,
                notificationTime: { hour: 8, minute: 30 },
                // Missing: heatNotificationCount, heatNotificationInterval
            });
            mockedAsyncStorage.getItem.mockResolvedValue(oldSettings);

            const { result } = renderHook(() => useNotificationSettings(), { wrapper });

            await waitFor(() => !result.current.isLoading);

            // Should have defaults for missing fields
            expect(result.current.settings.heatNotificationCount).toBe(3);
            expect(result.current.settings.heatNotificationInterval).toBe(20);
            // Preserved existing values
            expect(result.current.settings.heatNotificationsEnabled).toBe(true);
            expect(result.current.settings.notificationTime.hour).toBe(8);
            expect(result.current.settings.notificationTime.minute).toBe(30);
        });

        it('preserves all existing settings when loading', async () => {
            const existingSettings: NotificationSettings = {
                heatNotificationsEnabled: true,
                notificationTime: { hour: 9, minute: 15 },
                heatNotificationCount: 4,
                heatNotificationInterval: 21,
            };
            mockedAsyncStorage.getItem.mockResolvedValue(JSON.stringify(existingSettings));

            const { result } = renderHook(() => useNotificationSettings(), { wrapper });

            await waitFor(() => !result.current.isLoading);

            expect(result.current.settings.heatNotificationsEnabled).toBe(true);
            expect(result.current.settings.notificationTime.hour).toBe(9);
            expect(result.current.settings.notificationTime.minute).toBe(15);
            expect(result.current.settings.heatNotificationCount).toBe(4);
            expect(result.current.settings.heatNotificationInterval).toBe(21);
        });
    });

    describe('setHeatNotificationCount', () => {
        it('updates heatNotificationCount setting', async () => {
            const { result } = renderHook(() => useNotificationSettings(), { wrapper });

            await waitFor(() => !result.current.isLoading);

            await act(async () => {
                await result.current.setHeatNotificationCount(5);
            });

            expect(result.current.settings.heatNotificationCount).toBe(5);
        });

        it('persists heatNotificationCount to AsyncStorage', async () => {
            const { result } = renderHook(() => useNotificationSettings(), { wrapper });

            await waitFor(() => !result.current.isLoading);

            await act(async () => {
                await result.current.setHeatNotificationCount(5);
            });

            expect(mockedAsyncStorage.setItem).toHaveBeenCalledWith(
                NOTIFICATION_SETTINGS_KEY,
                expect.stringContaining('"heatNotificationCount":5')
            );
        });
    });

    describe('setHeatNotificationInterval', () => {
        it('updates heatNotificationInterval setting', async () => {
            const { result } = renderHook(() => useNotificationSettings(), { wrapper });

            await waitFor(() => !result.current.isLoading);

            await act(async () => {
                await result.current.setHeatNotificationInterval(21);
            });

            expect(result.current.settings.heatNotificationInterval).toBe(21);
        });

        it('persists heatNotificationInterval to AsyncStorage', async () => {
            const { result } = renderHook(() => useNotificationSettings(), { wrapper });

            await waitFor(() => !result.current.isLoading);

            await act(async () => {
                await result.current.setHeatNotificationInterval(25);
            });

            expect(mockedAsyncStorage.setItem).toHaveBeenCalledWith(
                NOTIFICATION_SETTINGS_KEY,
                expect.stringContaining('"heatNotificationInterval":25')
            );
        });
    });

    describe('setHeatNotificationsEnabled', () => {
        it('updates heatNotificationsEnabled setting', async () => {
            const { result } = renderHook(() => useNotificationSettings(), { wrapper });

            await waitFor(() => !result.current.isLoading);

            await act(async () => {
                await result.current.setHeatNotificationsEnabled(true);
            });

            expect(result.current.settings.heatNotificationsEnabled).toBe(true);
        });
    });

    describe('setNotificationTime', () => {
        it('updates notificationTime setting', async () => {
            const { result } = renderHook(() => useNotificationSettings(), { wrapper });

            await waitFor(() => !result.current.isLoading);

            await act(async () => {
                await result.current.setNotificationTime({ hour: 10, minute: 45 });
            });

            expect(result.current.settings.notificationTime.hour).toBe(10);
            expect(result.current.settings.notificationTime.minute).toBe(45);
        });
    });

    describe('isLoading state', () => {
        it('starts with isLoading true', () => {
            mockedAsyncStorage.getItem.mockReturnValue(new Promise(() => {})); // Never resolve

            const { result } = renderHook(() => useNotificationSettings(), { wrapper });

            expect(result.current.isLoading).toBe(true);
        });

        it('sets isLoading false after loading settings', async () => {
            const { result } = renderHook(() => useNotificationSettings(), { wrapper });

            await waitFor(() => !result.current.isLoading);

            expect(result.current.isLoading).toBe(false);
        });
    });
});
