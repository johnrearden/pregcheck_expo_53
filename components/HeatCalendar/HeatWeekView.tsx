import { HeatRecordType } from "@/contexts/HeatRecordContext";
import { useTheme } from "@/hooks/useTheme";
import { View, Text, StyleSheet } from "react-native";
import HeatDayCell from "./HeatDayCell";

export interface HeatWeekViewProps {
    startDate: Date; // Sunday of the week
    heatRecordsByDate: Map<string, HeatRecordType[]>;
    onDayPress: (date: Date, records: HeatRecordType[]) => void;
    testID?: string;
}

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// Format date as YYYY-MM-DD for map lookup
const formatDateKey = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
};

// Check if two dates are the same day
const isSameDay = (date1: Date, date2: Date): boolean => {
    return (
        date1.getFullYear() === date2.getFullYear() &&
        date1.getMonth() === date2.getMonth() &&
        date1.getDate() === date2.getDate()
    );
};

const HeatWeekView = (props: HeatWeekViewProps) => {
    const { colors } = useTheme();
    const { startDate, heatRecordsByDate, onDayPress } = props;

    const today = new Date();

    // Generate the 7 days of the week starting from startDate
    const weekDays: Date[] = [];
    for (let i = 0; i < 7; i++) {
        const day = new Date(startDate);
        day.setDate(startDate.getDate() + i);
        weekDays.push(day);
    }

    return (
        <View style={styles.container} testID={props.testID}>
            {/* Day labels header */}
            <View style={styles.headerRow}>
                {DAY_LABELS.map((label) => (
                    <View key={label} style={styles.headerCell}>
                        <Text style={[styles.headerText, { color: colors.fgColor }]}>
                            {label}
                        </Text>
                    </View>
                ))}
            </View>

            {/* Week row */}
            <View style={styles.weekRow}>
                {weekDays.map((date) => {
                    const dateKey = formatDateKey(date);
                    const records = heatRecordsByDate.get(dateKey) || [];
                    const isToday = isSameDay(date, today);

                    return (
                        <HeatDayCell
                            key={dateKey}
                            date={date}
                            heatCount={records.length}
                            isToday={isToday}
                            isCurrentMonth={true}
                            onPress={() => onDayPress(date, records)}
                            testID={`heat-day-cell-${dateKey}`}
                        />
                    );
                })}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        width: "100%",
        paddingHorizontal: 10,
    },
    headerRow: {
        flexDirection: "row",
        marginBottom: 5,
    },
    headerCell: {
        flex: 1,
        alignItems: "center",
    },
    headerText: {
        fontSize: 12,
        fontFamily: "Nunito-Bold",
    },
    weekRow: {
        flexDirection: "row",
    },
});

export default HeatWeekView;
