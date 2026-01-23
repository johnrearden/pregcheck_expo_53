import CowHeadshotIcon from "@/assets/icons/CowHeadshotIcon";
import Button from "@/components/Button";
import Navbar from "@/components/Navbar";
import { useHeatRecordMethod } from "@/contexts/HeatRecordContext";
import { useTheme } from "@/hooks/useTheme";
import { useRouter } from "expo-router";
import { useRef } from "react";
import { Platform, ScrollView, Text, View } from "react-native";
import { BannerAd, BannerAdSize, useForeground } from 'react-native-google-mobile-ads';

// Admob Banner Ad ids per platform
const ANDROID_BANNER_AD_UNIT_ID = "ca-app-pub-4741649534091227/3985014750";
const IOS_BANNER_AD_UNIT_ID = "ca-app-pub-4741649534091227/7924259762";

const adUnitId = Platform.select({
    ios: IOS_BANNER_AD_UNIT_ID,
    android: ANDROID_BANNER_AD_UNIT_ID,
}) ?? "";

// This component displays a summary of heat records after a session ends
const HeatSummary = () => {

    // AdMob Banner Ad configuration
    const bannerRef = useRef<BannerAd>(null);
    useForeground(() => {
        Platform.OS === 'ios' && bannerRef.current?.load();
    });

    const router = useRouter();
    const { baseStyle, colors } = useTheme();
    const { getStats } = useHeatRecordMethod();
    const stats = getStats();

    const handleHomePressed = () => {
        router.replace("/");
    };

    return (
        <View style={{
            flex: 1,
            justifyContent: "flex-start",
            alignItems: "center",
            backgroundColor: colors.bgColor
        }}>
            <Navbar title="Heat Date" subTitle="Summary" />

            <ScrollView
                contentContainerStyle={{
                    flexGrow: 1,
                    justifyContent: "flex-start",
                    alignItems: "center",
                    backgroundColor: colors.bgColor,
                    paddingBottom: 60, // Add padding to avoid content being hidden behind the ad
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

            {/* Position the ad at the bottom of the screen */}
            <View style={{
                position: 'absolute',
                bottom: 0,
                width: '100%',
                backgroundColor: colors.bgColor
            }}>
                <BannerAd
                    ref={bannerRef}
                    unitId={adUnitId ?? ""}
                    size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
                />
            </View>
        </View>
    );
}

export default HeatSummary;
