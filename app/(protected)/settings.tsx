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
import { PREG_SESSION_KEY, WEIGHT_SESSION_KEY } from "@/constants/asyncStorageKeys";


// This component provides settings options for the user, including logout, reset database, and delete account.
// It uses the AuthContext for authentication and SQLiteContext for database operations.
const Settings = () => {

    const { logout } = useAuth();
    const router = useRouter();
    const { colors } = useTheme();
    const db = useSQLiteContext();

    const [confirmModalVisible, setConfirmModalVisible] = useState(false);
    const [showTimePicker, setShowTimePicker] = useState(false);

    // Notification settings
    const { settings, setHeatNotificationsEnabled, setNotificationTime } = useNotificationSettings();

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