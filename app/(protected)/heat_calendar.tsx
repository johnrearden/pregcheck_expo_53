import { View } from "react-native";
import { useRouter } from "expo-router";
import Navbar from "@/components/Navbar";
import Button from "@/components/Button";
import { useTheme } from "@/hooks/useTheme";
import { HeatCalendar } from "@/components/HeatCalendar";

const HeatCalendarScreen = () => {
    const router = useRouter();
    const { colors } = useTheme();

    return (
        <View
            style={{
                flex: 1,
                justifyContent: "flex-start",
                alignItems: "center",
                backgroundColor: colors.bgColor,
            }}
        >
            <Navbar title="Heat Calendar" subTitle="Animals expected to be in heat" />

            <HeatCalendar testID="heat-calendar" />

            <Button
                title="Home"
                onPress={() => router.push("/")}
                style={{ marginVertical: 20, width: "70%" }}
                testID="heat-calendar-home-button"
            />
        </View>
    );
};

export default HeatCalendarScreen;
