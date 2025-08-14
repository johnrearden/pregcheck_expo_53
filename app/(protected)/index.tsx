import { Text, View, Image, Dimensions, Animated, TouchableOpacity, Alert } from "react-native";
import { ScrollView } from "react-native-gesture-handler";
import { useTheme } from "@/hooks/useTheme";
import Button from "@/components/Button";
import { useRouter } from "expo-router";
import { usePersistRecord, useRecord } from "@/contexts/RecordContext";
import { useWeightRecordMethod } from "@/contexts/WeightRecordContext";
import { useRecordSync } from "@/contexts/RecordSyncContext";
import { Entypo } from '@expo/vector-icons';
import { useEffect, useRef, useState } from "react";
import { useSQLiteContext } from "expo-sqlite";
import { AnimalType } from "@/constants/Types";


// The Index component serves as the main entry point for the app's home screen.
// It displays the main functionalities of the app, such as starting a pregnancy scan or a weight check.
export default function Index() {

    const { colors } = useTheme();
    const { width } = Dimensions.get("window");
    const router = useRouter();
    const db = useSQLiteContext();

    const { resetState, isSessionRunning } = usePersistRecord();
    const { createWeightSession, resetWeightState, isWeightSessionRunning } = useWeightRecordMethod();
    const record = useRecord();
    const { hasUnpostedRecords, hasUnpostedWeightRecords, isOnline, syncRecords } = useRecordSync();
    const [syncing, setSyncing] = useState(false);

    // Create an animated value for the opacity
    const opacityValue = useRef(new Animated.Value(1)).current;

    // Set up the flashing animation
    useEffect(() => {
        if (isSessionRunning) {
            const animate = () => {
                Animated.sequence([
                    Animated.timing(opacityValue, {
                        toValue: 0.2,
                        duration: 500,
                        useNativeDriver: true
                    }),
                    Animated.timing(opacityValue, {
                        toValue: 1,
                        duration: 500,
                        useNativeDriver: true
                    })
                ]).start(() => animate());
            };

            animate();

            return () => {
                // Stop the animation when component unmounts or session ends
                opacityValue.stopAnimation();
            };
        }
    }, [isSessionRunning]);

    // Determine which type of session is running (if any)
    const hasActiveSession = isSessionRunning || isWeightSessionRunning;
    const sessionType = isSessionRunning ? 'Pregnancy Scan' : 'Weight Scan';

    // Determine the sync icon color
    const hasPendingSync = hasUnpostedRecords || hasUnpostedWeightRecords;
    const syncIconColor = !hasPendingSync ? '#888888' : colors.warnColor;

    const handlePregScanPressed = () => {
        if (!isSessionRunning) {
            console.log("session not running");
            resetState();
            router.push("/gestation_days");
        } else if (record.animal === "") {
            router.push("/gestation_days");
        } else if (record.gestation_days === 0) {
            console.log("Gestation days not set");
            router.replace("/gestation_days");
        } else if (record.animal === AnimalType.Cow) {
            router.push("/create_cow_record");
        } else {
            router.push("/create_sheep_goat_record");
        }
    }

    const handleWeightScanPressed = () => {
        if (!isWeightSessionRunning) {
            resetWeightState();
            createWeightSession();
        }
        router.push("/calf_weight_record");
    }

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
        <ScrollView
            contentContainerStyle={{
                flexGrow: 1,
                justifyContent: "center",
                alignItems: "center",
            }}
            showsVerticalScrollIndicator={false}
            showsHorizontalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
        >
            <View
                style={{
                    flex: 1,
                    justifyContent: "flex-start",
                    alignItems: "center",
                    backgroundColor: colors.bgColor,
                    width: "100%",
                }}
            >
                <View style={{
                    position: 'relative',
                    width: width,
                    height: width,
                    overflow: 'hidden',
                    backgroundColor: 'transparent',
                }}>
                    <Image
                        source={require("@/assets/images/logo_gradient.png")}
                        style={{
                            width: '100%',
                            height: '100%',
                            backgroundColor: 'transparent',
                        }}
                        resizeMode="cover"
                    />


                    {isSessionRunning && (
                        <View
                            style={{
                                position: 'absolute',
                                right: 20,
                                bottom: 20,
                                alignItems: 'center'
                            }}
                        >
                            <Animated.View style={{ opacity: opacityValue }}>
                                <Entypo
                                    name="controller-record"
                                    size={24}
                                    color={colors.warnColor}
                                />
                            </Animated.View>
                            <Text
                                style={{
                                    color: colors.warnColor,
                                    fontSize: 9,
                                    fontWeight: 'bold',
                                    letterSpacing: 0.5,
                                }}
                            >
                                REC
                            </Text>
                        </View>
                    )}
                </View>

                {/* Session Status Bar */}
                {hasActiveSession && (
                    <View
                        style={{
                            width: '100%',
                            backgroundColor: colors.warnColor,
                            padding: 6,
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginBottom: 10,
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


                <Button
                    onPress={handlePregScanPressed}
                    title={isSessionRunning ? "Resume Preg Scan" : "Pregnancy Scan"}
                    style={{ marginTop: 30, marginBottom: 15, width: "70%" }}
                    outline={false}
                    disabled={isWeightSessionRunning}
                    testID="preg-scan-button"
                ></Button>
                <Button
                    onPress={handleWeightScanPressed}
                    title={isWeightSessionRunning ? "Resume weight session" : "Weight Check"}
                    style={{ marginVertical: 10, width: "70%" }}
                    outline
                    disabled={isSessionRunning}
                    testID="weight-check-button"
                ></Button>

                <Button
                    onPress={() => {
                        router.push("/search_type_choice");
                    }}
                    title="Search"
                    style={{ marginVertical: 10, width: "40%" }}
                    outline
                    testID="search-button"
                ></Button>

                <Button
                    onPress={() => {
                        router.push("/settings");
                    }}
                    title="Settings"
                    style={{ marginVertical: 10, width: "40%" }}
                    outline
                    testID="settings-button"
                ></Button>

            </View>

        </ScrollView>
    );
}


