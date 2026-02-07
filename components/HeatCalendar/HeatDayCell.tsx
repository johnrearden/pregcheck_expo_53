import { useTheme } from "@/hooks/useTheme";
import { MaterialIcons } from "@expo/vector-icons";
import { Text, TouchableOpacity, View, StyleSheet } from "react-native";

export interface HeatDayCellProps {
    date: Date;
    heatCount: number;
    isToday: boolean;
    isCurrentMonth?: boolean;
    onPress: () => void;
    testID?: string;
}

const HeatDayCell = (props: HeatDayCellProps) => {
    const { colors } = useTheme();
    const { date, heatCount, isToday, isCurrentMonth = true, onPress } = props;

    const dayNumber = date.getDate();
    const hasHeat = heatCount > 0;

    return (
        <TouchableOpacity
            onPress={onPress}
            style={[
                styles.cell,
                {
                    backgroundColor: colors.bgLightColor,
                    borderColor: isToday ? colors.scndColor : colors.thrdColor,
                    borderWidth: isToday ? 2 : 1,
                    opacity: isCurrentMonth ? 1 : 0.4,
                },
            ]}
            testID={props.testID}
        >
            <Text
                style={[
                    styles.dayNumber,
                    {
                        color: colors.fgColor,
                        fontWeight: isToday ? "bold" : "normal",
                    },
                ]}
            >
                {dayNumber}
            </Text>

            {hasHeat && (
                <View style={styles.heatIndicator}>
                    <MaterialIcons
                        name="whatshot"
                        size={16}
                        color={colors.warnColor}
                    />
                    <Text style={[styles.countBadge, { color: colors.warnColor }]}>
                        {heatCount}
                    </Text>
                </View>
            )}
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    cell: {
        flex: 1,
        aspectRatio: 1,
        margin: 2,
        borderRadius: 8,
        alignItems: "center",
        justifyContent: "center",
        minHeight: 45,
    },
    dayNumber: {
        fontSize: 14,
        fontFamily: "Nunito",
    },
    heatIndicator: {
        flexDirection: "row",
        alignItems: "center",
        marginTop: 2,
    },
    countBadge: {
        fontSize: 12,
        fontFamily: "Nunito-Bold",
        marginLeft: 2,
    },
});

export default HeatDayCell;
