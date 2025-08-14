import { Text, View, TouchableOpacity, Alert } from "react-native";
import { useTheme } from "@/hooks/useTheme";
import { LinearGradient } from "expo-linear-gradient";
import { usePersistRecord } from "@/contexts/RecordContext";
import { useWeightRecordMethod } from "@/contexts/WeightRecordContext";
import { useRecordSync } from "@/contexts/RecordSyncContext";
import { useState } from "react";
import { useSQLiteContext } from "expo-sqlite";


interface NavbarProps {
    title: string;
    subTitle: string;
}

const Navbar = (props: NavbarProps) => {
    const { baseStyle, colors } = useTheme();
    const { isSessionRunning } = usePersistRecord();
    const { isWeightSessionRunning } = useWeightRecordMethod();
    const { hasUnpostedRecords, hasUnpostedWeightRecords, isOnline, syncRecords } = useRecordSync();
    const db = useSQLiteContext();

    const [syncing, setSyncing] = useState(false);

    // Determine which type of session is running (if any)
    const hasActiveSession = isSessionRunning || isWeightSessionRunning;
    const sessionType = isSessionRunning ? 'Pregnancy Scan' : 'Weight Scan';


    // Determine the sync icon color
    const hasPendingSync = hasUnpostedRecords || hasUnpostedWeightRecords;
    const syncIconColor = !hasPendingSync
        ? '#888888' // Grey (no sync needed)
        : colors.warnColor;


    const handleSyncPress = async () => {
        if (hasPendingSync && isOnline) {
            try {
                setSyncing(true);
                await syncRecords();
                setSyncing(false);
                Alert.alert("Sync Complete", "Records synchronized successfully.");
            } catch (error) {
                Alert.alert("Sync Failed", "Failed to synchronize records. Please try again later.");
            }
        } else if (hasPendingSync) {
            Alert.alert("Offline", "Cannot sync while offline. Connect to the internet and try again.");
        } else {
            Alert.alert("No Sync Needed", "All records are already synchronized.");
        }
    };

    return (
        <View style={{ width: "100%", position: "relative" }} testID="navbar-container">
            <LinearGradient
                colors={[colors.brgtColor, colors.buttonColor]}
                style={[baseStyle.navbar, { width: "100%" }]}
            >
                <Text style={baseStyle.navbar_title}>{props.title}</Text>
                <Text style={baseStyle.navbar_subtitle}>{props.subTitle}</Text>
            </LinearGradient>

            {/* Session Status Bar */}
            {hasActiveSession && (
                <View
                    style={{
                        width: '100%',
                        backgroundColor: colors.warnColor,
                        padding: 6,
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}
                >
                    <Text
                        style={{
                            color: colors.bgColor,
                            fontWeight: 'bold',
                            fontSize: 14,
                        }}
                    >
                        {sessionType} Session in Progress
                    </Text>
                </View>
            )}

            {/* Sync Status Bar */}
            {hasPendingSync && !hasActiveSession && (
                <TouchableOpacity
                    onPress={handleSyncPress}
                    style={{
                        width: '100%',
                        backgroundColor: syncIconColor,
                        padding: 10,
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}
                    disabled={syncing}
                >
                    <View
                        style={{
                            width: '100%',
                            backgroundColor: syncIconColor,
                            padding: 10,
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                    >
                        <Text
                            style={{
                                color: colors.bgColor,
                                fontWeight: 'bold',
                                fontSize: 14,
                            }}
                        >
                            {syncing ? 'Syncing...' :
                                'You have unsynced records - ' +
                                (isOnline ? 'Tap to Sync' : 'Waiting for network')}
                        </Text>
                    </View>
                </TouchableOpacity>
            )}
        </View>
    );
}

export default Navbar;