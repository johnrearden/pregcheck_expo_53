import Navbar from "@/components/Navbar";
import {
    View, Text, TouchableWithoutFeedback, Platform, Keyboard,
    ScrollView, KeyboardAvoidingView, TouchableOpacity
} from "react-native";
import { useTheme } from "@/hooks/useTheme";
import NumberInput from "@/components/NumberInput";
import Button from "@/components/Button";
import { useRef, useState } from "react";
import { usePersistRecord, useRecord } from "@/contexts/RecordContext";
import { useRouter } from "expo-router";
import { AnimalType, TimeUnit } from "@/constants/Types";
import SegmentedControl from "@/components/SegmentedControl";

import CowBodyIcon from "@/assets/icons/CowBodyIcon";
import SheepBodyIcon from "@/assets/icons/SheepBodyIcon";
import GoatBodyIcon from "@/assets/icons/GoatBodyIcon";

import { BannerAd, BannerAdSize, TestIds, useForeground } from 'react-native-google-mobile-ads';


// Admob ids per platform
const ANDROID_BANNER_AD_UNIT_ID = "ca-app-pub-4741649534091227/7177144213";
const IOS_BANNER_AD_UNIT_ID     = "ca-app-pub-4741649534091227/6838458207";

// For testing and development builds
// const adUnitId = TestIds.BANNER;

// For production builds, use the following line instead
const adUnitId = Platform.select({
    ios: IOS_BANNER_AD_UNIT_ID,
    android: ANDROID_BANNER_AD_UNIT_ID,
});

console.log("Ad Unit ID:", adUnitId);


// This component is used to set the gestation days for the animal type selected
// It allows the user to select the animal type (Cow, Sheep, Goat) and enter the gestation days
// It also allows the user to select the time unit (Days, Weeks, Months) for the gestation period
const GestationDays = () => {

    // AdMob Banner Ad configuration
    const bannerRef = useRef<BannerAd>(null);
    useForeground(() => {
        Platform.OS === 'ios' && bannerRef.current?.load();
    });

    const router = useRouter();
    const record = useRecord();
    const { persistRecord, createSession } = usePersistRecord();
    const { baseStyle, colors } = useTheme();

    const [gestationDays, setGestationDays] = useState(0);

    const onAnimalTypeChange = (animalType: AnimalType) => {
        persistRecord({
            ...record,
            animal: animalType
        });
        setAnimalType(animalType);
    }
    const [animalType, setAnimalType] = useState<AnimalType>(
        record.animal && record.animal in AnimalType
            ? record.animal as AnimalType
            : AnimalType.Cow
    );

    const [timeUnit, setTimeUnit] = useState("days");
    const onTimeUnitChange = (value: string) => {
        if (value === 'Days') {
            value = 'days';
        } else if (value === 'Weeks') {
            value = 'weeks';
        } else if (value === 'Months') {
            value = 'months';
        }
        setTimeUnit(value);
        persistRecord({
            ...record,
            time_unit: value as TimeUnit
        });
    }


    const onNextClicked = () => {
        persistRecord({
            ...record,
            gestation_days: gestationDays,
        });
        createSession(gestationDays);
        if (animalType === AnimalType.Cow) {
            router.replace("/create_cow_record");
        } else {
            router.replace("/create_sheep_goat_record");
        }
    }

    let message = "Value ok";
    let MIN_GESTATION = animalType === AnimalType.Cow ? 260 : 130;
    let gestationDaysValid = false;


    if (gestationDays === 0) {
        message = "Can't be zero";
    } else if (gestationDays > 400) {
        message = "Max 400 days";
    } else if (gestationDays < MIN_GESTATION) {
        message = `Min ${MIN_GESTATION} days`;
    } else {
        gestationDaysValid = true;
    }
    const messageColor = gestationDays >= MIN_GESTATION && gestationDays <= 400 ? colors.success : colors.error;

    return (
        <View
            style={{
                flex: 1,
                justifyContent: "flex-start",
                alignItems: "center",
                backgroundColor: colors.bgColor,
            }}
        >
            <Navbar title="Preg Check" subTitle="Calculator" />

            <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
                <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
                    <ScrollView
                        contentContainerStyle={{
                            flexGrow: 1,
                            justifyContent: "flex-start",
                            alignItems: "center",
                            backgroundColor: colors.bgColor,
                            paddingBottom: 50, // Add padding to avoid content being hidden behind the ad
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
                            style={[baseStyle.heading_3, { marginTop: 25, marginBottom: 10 }]}
                        >
                            Pregnancy Scan Setup
                        </Text>

                        <View
                            style={{
                                width: "70%",
                                borderBottomWidth: 1,
                                paddingBottom: 5,
                                borderBottomColor: colors.thrdColor,
                            }}
                        />

                        <View style={{
                            width: "90%",
                            alignItems: "center", // Center children horizontally
                            justifyContent: "center", // Center children vertically
                        }}>
                            {/* Animal Type Selection */}
                            <View
                                style={{
                                    width: "100%",
                                    flexDirection: "row",
                                    justifyContent: "space-between",
                                    alignItems: "flex-end",
                                    marginBottom: 20,
                                }}
                            >
                                <TouchableOpacity
                                    onPress={() => onAnimalTypeChange(AnimalType.Sheep)}
                                    style={{
                                        padding: 10,
                                        alignItems: "center",
                                    }}
                                    testID="animal-type-sheep"
                                >
                                    <SheepBodyIcon
                                        width={50}
                                        height={50}
                                        style={{ marginBottom: 8 }}
                                        color={animalType === AnimalType.Sheep ? colors.brgtColor : undefined}
                                        opacity={animalType === AnimalType.Sheep ? 1 : 0.3}
                                    />
                                    <Text
                                        style={{
                                            color: animalType === AnimalType.Sheep ? colors.brgtColor : colors.fgColor,
                                            opacity: animalType === AnimalType.Sheep ? 1 : 0.3,
                                            fontSize: 16,
                                            fontWeight: animalType === AnimalType.Sheep ? "bold" : "normal",
                                        }}
                                    >
                                        Sheep
                                    </Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    onPress={() => onAnimalTypeChange(AnimalType.Cow)}
                                    style={{
                                        padding: 10,
                                        alignItems: "center",
                                    }}
                                    testID="animal-type-cow"
                                >
                                    <CowBodyIcon
                                        width={80}
                                        height={80}
                                        color={animalType === AnimalType.Cow ? colors.brgtColor : undefined}
                                        opacity={animalType === AnimalType.Cow ? 1 : 0.3}
                                    />
                                    <Text
                                        style={{
                                            color: animalType === AnimalType.Cow ? colors.brgtColor : colors.fgColor,
                                            opacity: animalType === AnimalType.Cow ? 1 : 0.3,
                                            fontSize: 16,
                                            fontWeight: animalType === AnimalType.Cow ? "bold" : "normal",
                                        }}
                                    >
                                        Cow
                                    </Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    onPress={() => onAnimalTypeChange(AnimalType.Goat)}
                                    style={{
                                        padding: 10,
                                        alignItems: "center",
                                    }}
                                    testID="animal-type-goat"
                                >
                                    <GoatBodyIcon
                                        width={50}
                                        height={50}
                                        style={{ marginBottom: 8 }}
                                        color={animalType === AnimalType.Goat ? colors.brgtColor : undefined}
                                        opacity={animalType === AnimalType.Goat ? 1 : 0.3}
                                    />
                                    <Text
                                        style={{
                                            color: animalType === AnimalType.Goat ? colors.brgtColor : colors.fgColor,
                                            opacity: animalType === AnimalType.Goat ? 1 : 0.3,
                                            fontSize: 16,
                                            fontWeight: animalType === AnimalType.Goat ? "bold" : "normal",
                                        }}
                                    >
                                        Goat
                                    </Text>
                                </TouchableOpacity>
                            </View>
                            {/* Gestation Days Input */}
                            <View style={{
                                width: "80%", // Control the width of this container
                                alignItems: "flex-start", // Align label to the left
                                marginTop: 20,
                            }}>
                                <Text
                                    style={[baseStyle.label, { padding: 0, fontSize: 18 }]}
                                >
                                    Gestation Period (In Days)
                                </Text>
                                <View style={{ width: "100%" }}>
                                    <NumberInput
                                        style={{ width: "100%" }}
                                        value={gestationDays}
                                        onChange={(e) => setGestationDays(parseInt(e) || 0)}
                                        testID="gestation-days-input"
                                    />
                                </View>
                                <Text
                                    style={{
                                        color: messageColor,
                                        fontSize: 14,
                                        marginTop: 5
                                    }}
                                >
                                    {message}
                                </Text>
                            </View>
                        </View>

                        <View
                            style={{
                                // width: "80%", // Match width with gestation days input
                                flexDirection: "column",
                                justifyContent: "center",
                                alignItems: "flex-start", // Align label to the left
                                marginTop: 40,
                            }}
                        >
                            <Text
                                style={[baseStyle.label, { padding: 0, fontSize: 18 }]}
                            >Pregnancy Time Units</Text>
                            <SegmentedControl
                                options={['Days', 'Weeks', 'Months']}
                                selectedOption={timeUnit === 'days' ? 'Days' : timeUnit === 'weeks' ? 'Weeks' : 'Months'}
                                onSelect={onTimeUnitChange}
                                fgColor={colors.brgtColor}
                                bgColor={colors.bgColor}
                                buttonStyleSelected={{
                                    fontSize: 20,
                                }}
                                buttonStyleUnselected={{
                                    fontSize: 20,
                                    opacity: 0.7,
                                }}
                                containerStyle={{
                                    marginTop: 4,
                                    width: "100%", // Make control take full width of its container
                                }}
                            />
                        </View>

                        <Button
                            onPress={onNextClicked}
                            title="Next"
                            style={{ marginTop: 60, width: "50%", marginBottom: 20 }}
                            outline={false}
                            disabled={!gestationDaysValid}
                            testID="next-button"
                        />
                    </ScrollView>
                </TouchableWithoutFeedback>
            </KeyboardAvoidingView>
            
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
};

export default GestationDays;
