import { HeatRecordType } from "@/contexts/HeatRecordContext";
import { useTheme } from "@/hooks/useTheme";
import { getHeatRecordsForDateRange } from "@/utilities/DatabaseUtils";
import { MaterialIcons } from "@expo/vector-icons";
import { useSQLiteContext } from "expo-sqlite";
import { useCallback, useEffect, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import SegmentedControl from "../SegmentedControl";
import HeatDayModal from "./HeatDayModal";
import HeatMonthView from "./HeatMonthView";
import HeatWeekView from "./HeatWeekView";

type ViewMode = "Weekly" | "Monthly";

// Date utility functions
const startOfWeek = (date: Date): Date => {
    const d = new Date(date);
    const day = d.getDay();
    d.setDate(d.getDate() - day);
    d.setHours(0, 0, 0, 0);
    return d;
};

const endOfWeek = (date: Date): Date => {
    const d = startOfWeek(date);
    d.setDate(d.getDate() + 6);
    return d;
};

const startOfMonth = (date: Date): Date => {
    return new Date(date.getFullYear(), date.getMonth(), 1);
};

const formatDateKey = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
};

// Group records by their next_heat_date
const groupRecordsByDate = (
    records: HeatRecordType[]
): Map<string, HeatRecordType[]> => {
    const grouped = new Map<string, HeatRecordType[]>();

    for (const record of records) {
        if (!record.next_heat_date) continue;

        // Parse the date and format as YYYY-MM-DD
        const dateStr = record.next_heat_date.split("T")[0];

        const existing = grouped.get(dateStr) || [];
        existing.push(record);
        grouped.set(dateStr, existing);
    }

    return grouped;
};

export interface HeatCalendarProps {
    testID?: string;
}

const HeatCalendar = (props: HeatCalendarProps) => {
    const { colors } = useTheme();
    const db = useSQLiteContext();

    const [viewMode, setViewMode] = useState<ViewMode>("Weekly");
    const [currentDate, setCurrentDate] = useState(new Date());
    const [heatRecordsByDate, setHeatRecordsByDate] = useState<
        Map<string, HeatRecordType[]>
    >(new Map());
    const [loading, setLoading] = useState(false);

    // Modal state
    const [modalVisible, setModalVisible] = useState(false);
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());
    const [selectedRecords, setSelectedRecords] = useState<HeatRecordType[]>([]);

    // Calculate date range based on view mode
    const getDateRange = useCallback(() => {
        if (viewMode === "Weekly") {
            return {
                start: startOfWeek(currentDate),
                end: endOfWeek(currentDate),
            };
        } else {
            // For monthly view, we need to include days from adjacent months
            // that appear in the calendar grid
            const monthStart = startOfMonth(currentDate);

            // Find the Sunday before or on the first day of the month
            const calendarStart = startOfWeek(monthStart);
            // Find the Saturday after or on the last day of the month
            // We show 6 weeks, so 42 days from calendar start
            const calendarEnd = new Date(calendarStart);
            calendarEnd.setDate(calendarStart.getDate() + 41);

            return {
                start: calendarStart,
                end: calendarEnd,
            };
        }
    }, [viewMode, currentDate]);

    // Load heat records for the current date range
    const loadRecords = useCallback(async () => {
        setLoading(true);
        try {
            const { start, end } = getDateRange();
            const startStr = formatDateKey(start);
            const endStr = formatDateKey(end);

            const records = await getHeatRecordsForDateRange(db, startStr, endStr);
            const grouped = groupRecordsByDate(records);
            setHeatRecordsByDate(grouped);
        } catch (error) {
            console.error("[HeatCalendar] Error loading records:", error);
        } finally {
            setLoading(false);
        }
    }, [db, getDateRange]);

    // Reload records when date range changes
    useEffect(() => {
        loadRecords();
    }, [loadRecords]);

    // Navigation handlers
    const handlePrevious = () => {
        const newDate = new Date(currentDate);
        if (viewMode === "Weekly") {
            newDate.setDate(newDate.getDate() - 7);
        } else {
            newDate.setMonth(newDate.getMonth() - 1);
        }
        setCurrentDate(newDate);
    };

    const handleNext = () => {
        const newDate = new Date(currentDate);
        if (viewMode === "Weekly") {
            newDate.setDate(newDate.getDate() + 7);
        } else {
            newDate.setMonth(newDate.getMonth() + 1);
        }
        setCurrentDate(newDate);
    };

    // Format header title based on view mode
    const getHeaderTitle = (): string => {
        if (viewMode === "Weekly") {
            const start = startOfWeek(currentDate);
            const end = endOfWeek(currentDate);
            const startMonth = start.toLocaleDateString("en-US", { month: "short" });
            const endMonth = end.toLocaleDateString("en-US", { month: "short" });

            if (startMonth === endMonth) {
                return `${startMonth} ${start.getDate()} - ${end.getDate()}, ${start.getFullYear()}`;
            } else {
                return `${startMonth} ${start.getDate()} - ${endMonth} ${end.getDate()}, ${end.getFullYear()}`;
            }
        } else {
            return currentDate.toLocaleDateString("en-US", {
                month: "long",
                year: "numeric",
            });
        }
    };

    // Handle day press
    const handleDayPress = (date: Date, records: HeatRecordType[]) => {
        setSelectedDate(date);
        setSelectedRecords(records);
        setModalVisible(true);
    };

    return (
        <View style={styles.container} testID={props.testID}>
            {/* View mode toggle */}
            <View style={styles.toggleContainer}>
                <SegmentedControl
                    options={["Weekly", "Monthly"]}
                    selectedOption={viewMode}
                    onSelect={(option) => setViewMode(option as ViewMode)}
                    fgColor={colors.scndColor}
                    bgColor={colors.bgColor}
                    testID="heat-calendar-view-toggle"
                />
            </View>

            {/* Navigation header */}
            <View style={styles.navigationHeader}>
                <TouchableOpacity
                    onPress={handlePrevious}
                    style={styles.navButton}
                    testID="heat-calendar-prev-button"
                >
                    <MaterialIcons
                        name="chevron-left"
                        size={32}
                        color={colors.fgColor}
                    />
                </TouchableOpacity>

                <Text style={[styles.headerTitle, { color: colors.fgColor }]}>
                    {getHeaderTitle()}
                </Text>

                <TouchableOpacity
                    onPress={handleNext}
                    style={styles.navButton}
                    testID="heat-calendar-next-button"
                >
                    <MaterialIcons
                        name="chevron-right"
                        size={32}
                        color={colors.fgColor}
                    />
                </TouchableOpacity>
            </View>

            {/* Calendar view */}
            {loading ? (
                <View style={styles.loadingContainer}>
                    <Text style={{ color: colors.fgColor }}>Loading...</Text>
                </View>
            ) : viewMode === "Weekly" ? (
                <HeatWeekView
                    startDate={startOfWeek(currentDate)}
                    heatRecordsByDate={heatRecordsByDate}
                    onDayPress={handleDayPress}
                    testID="heat-week-view"
                />
            ) : (
                <HeatMonthView
                    year={currentDate.getFullYear()}
                    month={currentDate.getMonth()}
                    heatRecordsByDate={heatRecordsByDate}
                    onDayPress={handleDayPress}
                    testID="heat-month-view"
                />
            )}

            {/* Heat day modal */}
            <HeatDayModal
                date={selectedDate}
                records={selectedRecords}
                visible={modalVisible}
                onClose={() => setModalVisible(false)}
                testID="heat-day-modal"
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        width: "100%",
    },
    toggleContainer: {
        alignItems: "center",
        marginTop: 25,
        marginBottom: 15,
    },
    navigationHeader: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 15,
        marginBottom: 15,
    },
    navButton: {
        padding: 5,
    },
    headerTitle: {
        fontSize: 18,
        fontFamily: "Nunito-Bold",
        textAlign: "center",
    },
    loadingContainer: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 50,
    },
});

export default HeatCalendar;
