import { useState } from 'react';
import { useRouter } from 'expo-router';
import { useSQLiteContext } from "expo-sqlite";
import { View, Text, TouchableOpacity, Alert } from 'react-native';
import Navbar from "@/components/Navbar";
import Button from "@/components/Button";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/auth/AuthContext";

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
    const { baseStyle, colors } = useTheme();
    const db = useSQLiteContext();

    const [confirmModalVisible, setConfirmModalVisible] = useState(false);

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

            <Button
                title="Home"
                onPress={() => router.push('/')}
                style={{ marginTop: 50, width: '70%' }}
                testID="settings-home-button"
            />

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