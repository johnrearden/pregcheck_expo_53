import { HeatRecordType } from "@/contexts/HeatRecordContext";
import { useTheme } from "@/hooks/useTheme";
import { View, Text, StyleSheet } from "react-native";
import HeatDayCell from "./HeatDayCell";

export interface HeatMonthViewProps {
    year: number;
    month: number; // 0-indexed (0 = January)
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

const HeatMonthView = (props: HeatMonthViewProps) => {
    const { colors } = useTheme();
    const { year, month, heatRecordsByDate, onDayPress } = props;

    const today = new Date();

    // Get first day of the month
    const firstDayOfMonth = new Date(year, month, 1);
    // Get the day of week for the first day (0 = Sunday)
    const startDayOfWeek = firstDayOfMonth.getDay();

    // Calculate the start date (may be in previous month)
    const calendarStartDate = new Date(year, month, 1 - startDayOfWeek);

    // Generate all calendar days (6 weeks = 42 days)
    const calendarDays: Date[] = [];
    for (let i = 0; i < 42; i++) {
        const day = new Date(calendarStartDate);
        day.setDate(calendarStartDate.getDate() + i);
        calendarDays.push(day);
    }

    // Split into weeks
    const weeks: Date[][] = [];
    for (let i = 0; i < 6; i++) {
        weeks.push(calendarDays.slice(i * 7, (i + 1) * 7));
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

            {/* Calendar grid */}
            {weeks.map((week, weekIndex) => (
                <View key={weekIndex} style={styles.weekRow}>
                    {week.map((date) => {
                        const dateKey = formatDateKey(date);
                        const records = heatRecordsByDate.get(dateKey) || [];
                        const isToday = isSameDay(date, today);
                        const isCurrentMonth = date.getMonth() === month;

                        return (
                            <HeatDayCell
                                key={dateKey}
                                date={date}
                                heatCount={records.length}
                                isToday={isToday}
                                isCurrentMonth={isCurrentMonth}
                                onPress={() => onDayPress(date, records)}
                                testID={`heat-day-cell-${dateKey}`}
                            />
                        );
                    })}
                </View>
            ))}
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

export default HeatMonthView;
