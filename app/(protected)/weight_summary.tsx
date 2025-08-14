import { View, Text, Dimensions, ScrollView, Platform, StatusBar } from "react-native";
import { useTheme } from "@/hooks/useTheme";
import { useWeightRecordMethod } from "@/contexts/WeightRecordContext";
import Navbar from "@/components/Navbar";
import Svg, { Circle, Line, Text as SvgText } from "react-native-svg";
import Button from "@/components/Button";
import { useRouter } from "expo-router";
import { Fragment, useRef, useEffect, useState } from "react";
import { InterstitialAd, TestIds, AdEventType } from 'react-native-google-mobile-ads';


// Admob ids per platform
const ANDROID_INTERSTITIAL_AD_UNIT_ID = "ca-app-pub-4741649534091227/6567715645";
const IOS_INTERSTITIAL_AD_UNIT_ID     = "ca-app-pub-4741649534091227/7562660165";

// For testing and development builds
// const adUnitId = TestIds.INTERSTITIAL;

// For production builds, use the following line instead
const adUnitId = Platform.select({
    ios: IOS_INTERSTITIAL_AD_UNIT_ID,
    android: ANDROID_INTERSTITIAL_AD_UNIT_ID,
}) ?? "";


// This component displays a summary of young stock weights in a scatter plot format.
const WeightSummary = () => {

    // Create a reference to the interstitial ad
    // This will be used to load and show the ad
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


    const { baseStyle, colors } = useTheme();
    const { getStats } = useWeightRecordMethod();
    const stats = getStats();
    const triples = stats.ageWeights;

    // Decide which weight unit to use based on the kilo_unit_count
    const weightUnit = stats.kilo_unit_count > stats.total / 2 ? "kg" : "lbs";

    // Convert weights to the chosen unit
    triples.forEach(triple => {
        if (weightUnit === "lbs" && triple.weight_unit === "kg") {
            triple.weight = Math.round(triple.weight * 2.20462); // Convert kg to lbs
            triple.weight_unit = "lbs"; // Update the unit to lbs
        } else if (weightUnit === "kg" && triple.weight_unit === "lbs") {
            triple.weight = Math.round(triple.weight / 2.20462); // Convert lbs to kg
            triple.weight_unit = "kg"; // Update the unit to kg
        }
    });

    const router = useRouter();

    const { width } = Dimensions.get('window');
    const height = width;

    // Find the min and max values for scaling the chart
    const minAge = 0;
    const maxAge = Math.max(...triples.map(d => d.age)) * 1.1;
    const minWeight = 0;
    const maxWeight = Math.max(...triples.map(d => d.weight)) * 1.1;

    // Chart padding to avoid points going out of the view
    const padding = 50;

    // Function to scale data to fit within the SVG canvas
    const scaleX = (value: number) => ((value - minAge) / (maxAge - minAge)) * (width - 2 * padding) + padding;
    const scaleY = (value: number) => height - padding - ((value - minWeight) / (maxWeight - minWeight)) * (height - 2 * padding);

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
            <Navbar title="Young Stock Weight" subTitle="Summary" />

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
                >Summary</Text>
                {/* SVG container for the scatter plot */}
                <Svg width={width} height={height}>
                    {/* X-Axis (Age) */}
                    <Line
                        x1={padding}
                        y1={height - padding}
                        x2={width - padding}
                        y2={height - padding}
                        stroke="black"
                        strokeWidth="2"
                    />

                    {/* Y-Axis (Weight) */}
                    <Line
                        x1={padding}
                        y1={padding}
                        x2={padding}
                        y2={height - padding}
                        stroke="black"
                        strokeWidth="2"
                    />

                    {/* Axis Labels */}
                    <SvgText x={width / 2} y={height - padding / 3} fontSize="12" textAnchor="middle">
                        Age (days)
                    </SvgText>
                    <SvgText
                        x={padding / 3}
                        y={height / 2}
                        fontSize="12"
                        textAnchor="middle"
                        transform={`rotate(-90 ${padding / 3}, ${height / 2})`}
                    >
                        Weight {weightUnit}
                    </SvgText>

                    {/* X-axis ticks and labels */}
                    {[...Array(5)].map((_, i) => {
                        const ageValue = minAge + ((maxAge - minAge) / 4) * i;
                        const x = scaleX(ageValue);
                        return (
                            <Fragment key={`x-tick-${i}`}>
                                <Line
                                    x1={x}
                                    y1={height - padding}
                                    x2={x}
                                    y2={height - padding + 6}
                                    stroke="black"
                                    strokeWidth="1"
                                />
                                <SvgText
                                    x={x}
                                    y={height - padding + 18}
                                    fontSize="10"
                                    textAnchor="middle"
                                >
                                    {ageValue.toFixed(0)}
                                </SvgText>
                            </Fragment>
                        );
                    })}

                    {/* Y-axis ticks and labels */}
                    {[...Array(5)].map((_, i) => {
                        const weightValue = minWeight + ((maxWeight - minWeight) / 4) * i;
                        const y = scaleY(weightValue);
                        return (
                            <Fragment key={`y-tick-${i}`}>
                                <Line
                                    x1={padding - 6}
                                    y1={y}
                                    x2={padding}
                                    y2={y}
                                    stroke="black"
                                    strokeWidth="1"
                                />
                                <SvgText
                                    x={padding - 10}
                                    y={y + 3}
                                    fontSize="10"
                                    textAnchor="end"
                                >
                                    {weightValue.toFixed(0)}
                                </SvgText>
                            </Fragment>
                        );
                    })}

                    {/* Scatter plot points */}
                    {triples.map((point, index) => (
                        <Circle
                            key={index}
                            cx={scaleX(point.age)}
                            cy={scaleY(point.weight)}
                            r="5"
                            fill={point.sex === "male" ? 'blue' : 'red'}
                        />
                    ))}
                </Svg>


                <Button
                    title="Home"
                    onPress={handleHomePressed}
                    style={{ marginTop: 50, marginBottom: 20, width: "50%" }}
                    outline={false}
                />

            </ScrollView>
        </View>
    );
}

export default WeightSummary;