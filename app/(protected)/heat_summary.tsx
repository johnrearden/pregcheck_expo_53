import { View, Text, ScrollView, Platform, StatusBar } from "react-native";
import { useTheme } from "@/hooks/useTheme";
import { useHeatRecordMethod } from "@/contexts/HeatRecordContext";
import Navbar from "@/components/Navbar";
import Button from "@/components/Button";
import { useRouter } from "expo-router";
import { useRef, useEffect, useState } from "react";
import { InterstitialAd, AdEventType } from 'react-native-google-mobile-ads';
import CowHeadshotIcon from "@/assets/icons/CowHeadshotIcon";

// Admob ids per platform
const ANDROID_INTERSTITIAL_AD_UNIT_ID = "ca-app-pub-4741649534091227/6567715645";
const IOS_INTERSTITIAL_AD_UNIT_ID = "ca-app-pub-4741649534091227/7562660165";

const adUnitId = Platform.select({
    ios: IOS_INTERSTITIAL_AD_UNIT_ID,
    android: ANDROID_INTERSTITIAL_AD_UNIT_ID,
}) ?? "";

// This component displays a summary of heat records after a session ends
const HeatSummary = () => {

    // Create a reference to the interstitial ad
    const interstitialRef = useRef(
        InterstitialAd.createForAdRequest(adUnitId)
    ).current;
    const [adLoaded, setAdLoaded] = useState(false);

    const router = useRouter();

    // Assign ad event listeners
    useEffect(() => {
        const unsubscribeLoaded = interstitialRef.addAdEventListener(AdEventType.LOADED, () => {
            setAdLoaded(true);
            console.log('Interstitial ad loaded');
        });

        const unsubscribeOpened = interstitialRef.addAdEventListener(AdEventType.OPENED, () => {
            if (Platform.OS === 'ios') {
                StatusBar.setHidden(true);
            }
        });

        const unsubscribeClosed = interstitialRef.addAdEventListener(AdEventType.CLOSED, () => {
            if (Platform.OS === 'ios') {
                StatusBar.setHidden(false);
            }

            setAdLoaded(false);
            router.replace("/");
        });

        // Start loading the interstitial straight away
        interstitialRef.load();

        // Unsubscribe from events on unmount
        return () => {
            unsubscribeLoaded();
            unsubscribeOpened();
            unsubscribeClosed();
        };
    }, []);

    const { baseStyle, colors } = useTheme();
    const { getStats } = useHeatRecordMethod();
    const stats = getStats();

    // If the ad is loaded, show it when the home button is pressed
    const handleHomePressed = () => {
        if (adLoaded) {
            interstitialRef.show();
        } else {
            router.replace("/");
        }
    };

    return (
        <View style={{
            flex: 1,
            justifyContent: "flex-start",
            alignItems: "center",
            backgroundColor: colors.bgColor
        }}>
            <Navbar title="Heat Check" subTitle="Summary" />

            <ScrollView
                contentContainerStyle={{
                    flexGrow: 1,
                    justifyContent: "flex-start",
                    alignItems: "center",
                    backgroundColor: colors.bgColor,
                }}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
                showsHorizontalScrollIndicator={false}
                style={{
                    flex: 1,
                    width: "100%",
                }}
            >

                <Text
                    style={[baseStyle.heading_1, { marginTop: 30 }]}
                >
                    Session Complete
                </Text>

                <View style={{
                    marginTop: 40,
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: 30,
                    backgroundColor: colors.bgLightColor,
                    borderRadius: 20,
                    borderWidth: 2,
                    borderColor: colors.brgtColor,
                    width: '80%',
                }}>
                    <CowHeadshotIcon
                        width={60}
                        height={60}
                        color={colors.brgtColor}
                    />
                    <Text style={{
                        color: colors.fgColor,
                        fontSize: 24,
                        fontWeight: 'bold',
                        marginTop: 20,
                    }}>
                        Heat Records
                    </Text>
                    <Text style={{
                        color: colors.brgtColor,
                        fontSize: 60,
                        fontWeight: 'bold',
                        marginTop: 10,
                    }}>
                        {stats.total}
                    </Text>
                </View>

                <Text style={{
                    color: colors.fgColor,
                    fontSize: 16,
                    marginTop: 30,
                    textAlign: 'center',
                    paddingHorizontal: 20,
                }}>
                    Your heat records have been saved and will sync when connected to the internet.
                </Text>

                <Button
                    title="Home"
                    onPress={handleHomePressed}
                    style={{ marginTop: 50, marginBottom: 20, width: "50%" }}
                    outline={false}
                    testID="heat-summary-home-button"
                />

            </ScrollView>
        </View>
    );
}

export default HeatSummary;
