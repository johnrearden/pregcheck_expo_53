import { View, Text, Dimensions, ScrollView, Platform,
    StatusBar
 } from "react-native";
import Navbar from "@/components/Navbar";
import { useRouter } from "expo-router";
import { useTheme } from "@/hooks/useTheme";
import { usePersistRecord } from "@/contexts/RecordContext";
import { BarChart } from "react-native-chart-kit";
import Button from "@/components/Button";
import YearCalendar from "@/components/YearCalendar";
import { InterstitialAd, TestIds, AdEventType } from 'react-native-google-mobile-ads';
import { useEffect, useRef, useState } from "react";


// Admob ids per platform
const ANDROID_INTERSTITIAL_AD_UNIT_ID = "ca-app-pub-4741649534091227/5857862102";
const IOS_INTERSTITIAL_AD_UNIT_ID     = "ca-app-pub-4741649534091227/8859655308";

// For testing and development builds
// const adUnitId = TestIds.INTERSTITIAL; 

// For production builds, use the following line instead
const adUnitId = Platform.select({
    ios: IOS_INTERSTITIAL_AD_UNIT_ID,
    android: ANDROID_INTERSTITIAL_AD_UNIT_ID,
}) || ""; // fallback to empty string to ensure type is always string


const PregSummarySheepGoat = () => {

    const interstitialRef = useRef(
            InterstitialAd.createForAdRequest(adUnitId)
        ).current;;
        const [adLoaded, setAdLoaded] = useState(false);
    
    
        // Assign ad event listeners
        useEffect(() => {
            const unsubscribeLoaded = interstitialRef.addAdEventListener(AdEventType.LOADED, () => {
                setAdLoaded(true);
                console.log('Interstitial ad loaded');
            });
    
            const unsubscribeOpened = interstitialRef.addAdEventListener(AdEventType.OPENED, () => {
                if (Platform.OS === 'ios') {
                    // Prevent the close button from being unreachable by hiding the status bar on iOS
                    StatusBar.setHidden(true);
                }
            });
    
            const unsubscribeClosed = interstitialRef.addAdEventListener(AdEventType.CLOSED, () => {
                if (Platform.OS === 'ios') {
                    StatusBar.setHidden(false);
                }
    
                // Load the next interstitial ad
                setAdLoaded(false);
                router.replace("/");
    
    
                // interstitialRef.load();
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

    const router = useRouter();
    const screenWidth = Dimensions.get("window").width;

    const { getStats } = usePersistRecord();
    const stats = getStats();
    const { baseStyle, colors } = useTheme();

    const percentagePregnant =
        stats.pregnant > 0 ? ((stats.pregnant / stats.total) * 100).toFixed(1) : 0;

    const chartConfig = {
        backgroundColor: colors.bgColor,
        backgroundGradientFrom: colors.scndColor,
        backgroundGradientTo: colors.brgtColor,
        decimalPlaces: 0, // optional, defaults to 2dp
        color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
        labelColor: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
        style: {
            borderRadius: 16
        },
        propsForDots: {
            r: "6",
            strokeWidth: "2",
            stroke: "#ffa726"
        }
    }

    const data = {
        labels: ['Single', 'Twins', 'Triplets', 'Quads', 'Quins'],
        datasets: [
            {
                data: [stats.single, stats.twins, stats.triplets, stats.quads, stats.quins]
            }
        ]
    }

    // Create an object to hold the years and their corresponding dates
    const years: { [key: number]: Map<Date, number> } = {};

    // Loop through the dates and group them by year
    stats.dates.forEach((date: Date) => {
        const year: number = date.getFullYear();
        if (!years[year]) {
            years[year] = new Map<Date, number>();
        }
        if (!years[year].has(date)) {
            years[year].set(date, 0);
        }
        // Increment the count for the date in the corresponding year
        years[year].set(date, (years[year].get(date) ?? 0) + 1);
    });


    const handleHomePressed = () => {
        if (adLoaded) {
            interstitialRef.show();
        } else {
            router.replace("/");
        }
    };

    return (
        <View style={{ flex: 1 }}>
            <Navbar title="Preg Check" subTitle="Summary" />
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
                <View style={{
                    flex: 1,
                    justifyContent: "flex-start",
                    alignItems: "center",
                    backgroundColor: colors.bgColor
                }}>
                    <Text
                        style={[baseStyle.heading_1, { marginTop: 30 }]}
                    >Summary</Text>
                    <View style={baseStyle.hr} />
                    <View style={{ marginTop: 20 }}>
                        <Text
                            style={[baseStyle.label, { textAlign: "center" }]}
                        >Pregnant    {percentagePregnant}%</Text>

                    </View>
                    <View style={{ marginTop: 20 }}>
                        <BarChart
                            style={{
                                borderRadius: 10,
                            }}
                            data={data}
                            width={screenWidth}
                            height={220}
                            chartConfig={chartConfig}
                            yAxisLabel=""
                            yAxisSuffix=""
                            showValuesOnTopOfBars
                            withHorizontalLabels={false}
                        />
                    </View>
                    <Text style={{ color: colors.success, fontSize: 20, marginTop: 20 }}>Results email sent!</Text>

                    <View style={baseStyle.hr} />
                    {Object.keys(years).map((yr, index) => (
                        <View
                            key={index}
                            style={{
                                flex: 1,
                                justifyContent: "flex-end",
                                alignItems: "center",
                                backgroundColor: colors.bgColor,
                                width: "100%",
                                marginTop: 30,
                            }}>
                            <YearCalendar
                                year={parseInt(yr)}
                                dates={years[parseInt(yr)]} />
                        </View>
                    ))}
                    <Button
                        title="Home"
                        onPress={handleHomePressed}
                        style={{ marginTop: 50, marginBottom: 50, width: "50%" }}
                        outline={false}
                    />
                </View>
            </ScrollView>
        </View >
    );
}

export default PregSummarySheepGoat;