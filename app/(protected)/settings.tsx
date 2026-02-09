import { useState } from 'react';
import { useRouter } from 'expo-router';
import { useSQLiteContext } from "expo-sqlite";
import { View, Text, TouchableOpacity, Alert, Switch, Platform, ScrollView } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import Navbar from "@/components/Navbar";
import Button from "@/components/Button";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/auth/AuthContext";
import { useNotificationSettings } from "@/contexts/NotificationSettingsContext";

import DeleteUserConfirmModal from '@/components/DeleteUserConfirmModal';
import { api } from '@/services/ApiService';

import { truncateAllTables } from "@/utilities/DatabaseUtils";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { PREG_SESSION_KEY, WEIGHT_SESSION_KEY, HEAT_SESSION_KEY } from "@/constants/asyncStorageKeys";
import { getAllScheduledHeatNotifications } from "@/services/HeatNotificationService";
import * as Notifications from 'expo-notifications';


// This component provides settings options for the user, including logout, reset database, and delete account.
// It uses the AuthContext for authentication and SQLiteContext for database operations.
const Settings = () => {

    const { logout } = useAuth();
    const router = useRouter();
    const { colors } = useTheme();
    const db = useSQLiteContext();

    const [confirmModalVisible, setConfirmModalVisible] = useState(false);
    const [showTimePicker, setShowTimePicker] = useState(false);
    const [scheduledNotifications, setScheduledNotifications] = useState<Notifications.NotificationRequest[]>([]);
    const [showDebugInfo, setShowDebugInfo] = useState(false);

    // Notification settings
    const {
        settings,
        setHeatNotificationsEnabled,
        setNotificationTime,
        setHeatNotificationCount,
        setHeatNotificationInterval,
    } = useNotificationSettings();

    // Available options for notification count
    const notificationCountOptions = [1, 2, 3, 4, 5];

    // Handle toggle of heat notifications
    const handleNotificationToggle = async (enabled: boolean) => {
        await setHeatNotificationsEnabled(enabled);
        // Reschedule will be triggered by the NotificationContext when settings change
    };

    // Handle time picker change
    const handleTimeChange = async (event: any, selectedDate?: Date) => {
        if (Platform.OS === 'android') {
            setShowTimePicker(false);
        }

        if (selectedDate) {
            const hour = selectedDate.getHours();
            const minute = selectedDate.getMinutes();
            await setNotificationTime({ hour, minute });
            // Reschedule will be triggered by the NotificationContext when settings change
        }
    };

    // Format time for display
    const formatTime = (hour: number, minute: number): string => {
        const period = hour >= 12 ? 'PM' : 'AM';
        const displayHour = hour % 12 || 12;
        const displayMinute = minute.toString().padStart(2, '0');
        return `${displayHour}:${displayMinute} ${period}`;
    };

    // Handle notification count change
    const handleCountChange = async (count: number) => {
        await setHeatNotificationCount(count);
    };

    // Handle interval change
    const handleIntervalChange = async (days: number) => {
        if (days >= 1 && days <= 60) {
            await setHeatNotificationInterval(days);
        }
    };

    // Load scheduled notifications for debug display
    const loadScheduledNotifications = async () => {
        const notifications = await getAllScheduledHeatNotifications();
        setScheduledNotifications(notifications);
        setShowDebugInfo(true);
    };

    // Extract date from notification identifier (format: heat-YYYY-MM-DD)
    const getDateFromIdentifier = (identifier: string): string => {
        const dateStr = identifier.replace('heat-', '');
        const [year, month, day] = dateStr.split('-');
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const monthName = monthNames[parseInt(month, 10) - 1];
        return `${day} ${monthName} ${year}`;
    };

    // Format scheduled time from trigger
    const getScheduledTime = (trigger: Notifications.NotificationTrigger | null): string => {
        if (!trigger) return 'Unknown';
        // Android: Date triggers store the timestamp in 'value' property when retrieved
        if ('value' in trigger && typeof trigger.value === 'number') {
            const date = new Date(trigger.value);
            return formatTime(date.getHours(), date.getMinutes());
        }
        // iOS: Date triggers are converted to calendar triggers with dateComponents
        if ('dateComponents' in trigger && trigger.dateComponents) {
            const { hour, minute } = trigger.dateComponents as { hour?: number; minute?: number };
            if (hour !== undefined && minute !== undefined) {
                return formatTime(hour, minute);
            }
        }
        // Fallback for 'date' property (input format)
        if ('date' in trigger && trigger.date) {
            const date = new Date(trigger.date as number | Date);
            return formatTime(date.getHours(), date.getMinutes());
        }
        return 'Unknown';
    };

    const onLogoutClicked = () => {
        logout();
    }

    const handleDeleteAccount = async () => {
        const response = await api.post(
            'exam_session/delete_account/',
            {},
        )
        logout();
        console.log(response);
    }

    const handleResetDatabase = () => {
        Alert.alert(
            "Reset Database",
            "This will delete ALL records and sessions from this device. Are you sure?",
            [
                {
                    text: "Cancel",
                    style: "cancel"
                },
                {
                    text: "Reset",
                    onPress: async () => {
                        try {
                            await truncateAllTables(db);
                            // Also clear AsyncStorage
                            await AsyncStorage.removeItem(PREG_SESSION_KEY);
                            await AsyncStorage.removeItem(WEIGHT_SESSION_KEY);
                            await AsyncStorage.removeItem(HEAT_SESSION_KEY);
                            Alert.alert("Database Reset", "All data has been cleared.");
                        } catch (error) {
                            console.error("Error resetting database:", error);
                            Alert.alert("Error", "Failed to reset database.");
                        }
                    },
                    style: "destructive"
                }
            ]
        );
    };

    return (
        <View
            style={{
                flex: 1,
                justifyContent: "flex-start",
                alignItems: "center",
                backgroundColor: colors.bgColor,
            }}
        >
            <Navbar title="Settings" subTitle="Manage your account" />

            <ScrollView
                style={{ flex: 1, width: '100%' }}
                contentContainerStyle={{ alignItems: 'center', paddingBottom: 40 }}
            >
                <Button
                    title="Home"
                    onPress={() => router.push('/')}
                    style={{ marginTop: 50, width: '70%' }}
                    testID="settings-home-button"
                />

            {/* Notification Settings Section */}
            <View style={{
                width: '90%',
                marginTop: 40,
                padding: 16,
                backgroundColor: colors.bgLightColor,
                borderRadius: 12,
            }}>
                <Text style={{
                    fontSize: 18,
                    fontWeight: 'bold',
                    color: colors.fgColor,
                    marginBottom: 12,
                }}>
                    Notifications
                </Text>

                {/* Heat Notifications Toggle */}
                <View style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    paddingVertical: 8,
                }}>
                    <View style={{ flex: 1 }}>
                        <Text style={{
                            fontSize: 16,
                            color: colors.fgColor,
                        }}>
                            Heat Notifications
                        </Text>
                        <Text style={{
                            fontSize: 12,
                            color: colors.thrdColor,
                            marginTop: 4,
                        }}>
                            Get notified when animals are expected to be in heat
                        </Text>
                    </View>
                    <Switch
                        value={settings.heatNotificationsEnabled}
                        onValueChange={handleNotificationToggle}
                        trackColor={{ false: colors.thrdColor, true: colors.brgtColor }}
                        thumbColor={settings.heatNotificationsEnabled ? colors.bgColor : colors.thrdColor}
                        testID="heat-notifications-toggle"
                    />
                </View>

                {/* Notification Time Picker (visible when notifications enabled) */}
                {settings.heatNotificationsEnabled && (
                    <View style={{
                        marginTop: 16,
                        paddingTop: 16,
                        borderTopWidth: 1,
                        borderTopColor: colors.thrdColor,
                    }}>
                        <Text style={{
                            fontSize: 16,
                            color: colors.fgColor,
                            marginBottom: 8,
                        }}>
                            Notification Time
                        </Text>
                        <TouchableOpacity
                            onPress={() => setShowTimePicker(true)}
                            style={{
                                backgroundColor: colors.bgColor,
                                padding: 12,
                                borderRadius: 8,
                                borderWidth: 1,
                                borderColor: colors.thrdColor,
                            }}
                            testID="notification-time-button"
                        >
                            <Text style={{
                                fontSize: 16,
                                color: colors.brgtColor,
                                textAlign: 'center',
                            }}>
                                {formatTime(settings.notificationTime.hour, settings.notificationTime.minute)}
                            </Text>
                        </TouchableOpacity>

                        {showTimePicker && (
                            <DateTimePicker
                                value={new Date(2000, 0, 1, settings.notificationTime.hour, settings.notificationTime.minute)}
                                mode="time"
                                is24Hour={false}
                                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                                onChange={handleTimeChange}
                                testID="notification-time-picker"
                            />
                        )}

                        {Platform.OS === 'ios' && showTimePicker && (
                            <TouchableOpacity
                                onPress={() => setShowTimePicker(false)}
                                style={{
                                    marginTop: 8,
                                    padding: 8,
                                    alignItems: 'center',
                                }}
                            >
                                <Text style={{ color: colors.brgtColor, fontSize: 16 }}>Done</Text>
                            </TouchableOpacity>
                        )}

                        {/* Notification Count Selector */}
                        <View style={{ marginTop: 16 }}>
                            <Text style={{
                                fontSize: 16,
                                color: colors.fgColor,
                                marginBottom: 8,
                            }}>
                                Reminders Per Animal
                            </Text>
                            <Text style={{
                                fontSize: 12,
                                color: colors.thrdColor,
                                marginBottom: 8,
                            }}>
                                How many times to notify for each heat record
                            </Text>
                            <View style={{
                                flexDirection: 'row',
                                justifyContent: 'space-between',
                            }}>
                                {notificationCountOptions.map((count) => (
                                    <TouchableOpacity
                                        key={count}
                                        onPress={() => handleCountChange(count)}
                                        style={{
                                            flex: 1,
                                            marginHorizontal: 4,
                                            padding: 12,
                                            borderRadius: 8,
                                            backgroundColor: settings.heatNotificationCount === count
                                                ? colors.brgtColor
                                                : colors.bgColor,
                                            borderWidth: 1,
                                            borderColor: settings.heatNotificationCount === count
                                                ? colors.brgtColor
                                                : colors.thrdColor,
                                            alignItems: 'center',
                                        }}
                                        testID={`notification-count-${count}`}
                                    >
                                        <Text style={{
                                            fontSize: 16,
                                            fontWeight: '600',
                                            color: settings.heatNotificationCount === count
                                                ? colors.bgColor
                                                : colors.fgColor,
                                        }}>
                                            {count}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>

                        {/* Notification Interval Selector */}
                        <View style={{ marginTop: 16 }}>
                            <Text style={{
                                fontSize: 16,
                                color: colors.fgColor,
                                marginBottom: 8,
                            }}>
                                Cycle Days
                            </Text>
                            <Text style={{
                                fontSize: 12,
                                color: colors.thrdColor,
                                marginBottom: 8,
                            }}>
                                Length of the estrus cycle in days
                            </Text>
                            <View style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}>
                                <TouchableOpacity
                                    onPress={() => handleIntervalChange(settings.heatNotificationInterval - 1)}
                                    style={{
                                        width: 44,
                                        height: 44,
                                        borderRadius: 22,
                                        backgroundColor: colors.bgColor,
                                        borderWidth: 1,
                                        borderColor: colors.thrdColor,
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                    }}
                                    disabled={settings.heatNotificationInterval <= 1}
                                    testID="interval-decrease"
                                >
                                    <Text style={{
                                        fontSize: 24,
                                        color: settings.heatNotificationInterval <= 1 ? colors.thrdColor : colors.fgColor,
                                    }}>
                                        -
                                    </Text>
                                </TouchableOpacity>
                                <View style={{
                                    paddingHorizontal: 24,
                                    alignItems: 'center',
                                }}>
                                    <Text style={{
                                        fontSize: 24,
                                        fontWeight: '600',
                                        color: colors.brgtColor,
                                    }}>
                                        {settings.heatNotificationInterval}
                                    </Text>
                                    <Text style={{
                                        fontSize: 12,
                                        color: colors.thrdColor,
                                    }}>
                                        days
                                    </Text>
                                </View>
                                <TouchableOpacity
                                    onPress={() => handleIntervalChange(settings.heatNotificationInterval + 1)}
                                    style={{
                                        width: 44,
                                        height: 44,
                                        borderRadius: 22,
                                        backgroundColor: colors.bgColor,
                                        borderWidth: 1,
                                        borderColor: colors.thrdColor,
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                    }}
                                    disabled={settings.heatNotificationInterval >= 60}
                                    testID="interval-increase"
                                >
                                    <Text style={{
                                        fontSize: 24,
                                        color: settings.heatNotificationInterval >= 60 ? colors.thrdColor : colors.fgColor,
                                    }}>
                                        +
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* Debug: Show Scheduled Notifications */}
                        <TouchableOpacity
                            onPress={loadScheduledNotifications}
                            style={{
                                marginTop: 16,
                                backgroundColor: colors.bgColor,
                                padding: 12,
                                borderRadius: 8,
                                borderWidth: 1,
                                borderColor: colors.thrdColor,
                            }}
                            testID="show-scheduled-notifications-button"
                        >
                            <Text style={{
                                fontSize: 14,
                                color: colors.thrdColor,
                                textAlign: 'center',
                            }}>
                                Show Scheduled Notifications
                            </Text>
                        </TouchableOpacity>

                        {showDebugInfo && (
                            <View style={{ marginTop: 12 }}>
                                <Text style={{
                                    fontSize: 14,
                                    color: colors.fgColor,
                                    fontWeight: 'bold',
                                    marginBottom: 8,
                                }}>
                                    Scheduled Heat Notifications ({scheduledNotifications.length})
                                </Text>
                                {scheduledNotifications.length === 0 ? (
                                    <Text style={{
                                        fontSize: 12,
                                        color: colors.thrdColor,
                                        fontStyle: 'italic',
                                    }}>
                                        No notifications scheduled
                                    </Text>
                                ) : (
                                    scheduledNotifications.map((notification, index) => (
                                        <View
                                            key={notification.identifier}
                                            style={{
                                                backgroundColor: colors.bgColor,
                                                padding: 8,
                                                borderRadius: 6,
                                                marginBottom: 6,
                                                borderWidth: 1,
                                                borderColor: colors.thrdColor,
                                            }}
                                        >
                                            <Text style={{
                                                fontSize: 13,
                                                color: colors.brgtColor,
                                                fontWeight: '600',
                                            }}>
                                                {getDateFromIdentifier(notification.identifier)} at {getScheduledTime(notification.trigger)}
                                            </Text>
                                            <Text style={{
                                                fontSize: 11,
                                                color: colors.thrdColor,
                                                marginTop: 4,
                                            }}
                                            numberOfLines={2}
                                            >
                                                {notification.content.body}
                                            </Text>
                                        </View>
                                    ))
                                )}
                                <TouchableOpacity
                                    onPress={() => setShowDebugInfo(false)}
                                    style={{
                                        marginTop: 8,
                                        padding: 6,
                                        alignItems: 'center',
                                    }}
                                >
                                    <Text style={{ color: colors.thrdColor, fontSize: 12 }}>Hide</Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>
                )}
            </View>

            <Button
                title="Delete All Data"
                onPress={handleResetDatabase}
                outline
                style={{ marginTop: 30, width: '70%' }}
                testID="settings-reset-database-button"
            />

            <Button
                title="Logout"
                onPress={onLogoutClicked}
                outline
                style={{ marginTop: 30, width: '70%' }}
                testID="settings-logout-button"
            />

            <TouchableOpacity
                onPress={() => setConfirmModalVisible(true)}
                style={{
                    marginTop: 60,
                    width: '70%',
                    backgroundColor: colors.error,
                    paddingHorizontal: 10,
                    paddingVertical: 8,
                    borderRadius: 10,
                    alignItems: 'center',
                    justifyContent: 'center',
                    shadowOffset: {
                        width: 0,
                        height: 2,
                    },
                    shadowOpacity: 0.25,
                    shadowRadius: 3.84,
                    elevation: 5,
                }}
                testID='settings-delete-account-button'
            >
                <Text
                    style={{
                        color: colors.bgColor,
                        fontSize: 24,
                    }}
                >
                    Delete Account
                </Text>
            </TouchableOpacity>
            </ScrollView>

            {/* Confirmation modal for deleting user account */}
            <DeleteUserConfirmModal
                title="Are you sure?"
                message="This will delete your user account and all of your data 
                permanently. It will not be possible to recover your data after this action."
                buttonText="Delete"
                onConfirm={handleDeleteAccount}
                onCancel={() => setConfirmModalVisible(false)}
                modalVisible={confirmModalVisible}
            />

        </View>
    )
}

export default Settings;