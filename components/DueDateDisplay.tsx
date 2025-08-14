import { getAllFutureDueRecords } from "@/utilities/DatabaseUtils";
import { useSQLiteContext } from "expo-sqlite"
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from "react-native";
import { RecordType } from "@/contexts/RecordContext";
import { useEffect, useState } from "react";
import { useTheme } from "@/hooks/useTheme";
import { useRouter } from "expo-router";
import { Feather } from '@expo/vector-icons';


interface MonthData {
    monthStr: string;
    month: number;
    year: number;
    count: number;
}


interface DayData {
    day: number;
    count: number;
    records: RecordType[];
}

// Main component to display due dates in a 3-column layout
// The first column shows months, the second shows days in the selected month, and the third shows tags due on the selected day.
// It allows users to select a month, then a day, and view the associated tags.
// It also includes a floating home button for easy navigation back to the home screen.
const DueDateDisplay = () => {
    const db = useSQLiteContext();
    const { colors } = useTheme();
    const router = useRouter();

    const [records, setRecords] = useState<RecordType[]>([]);
    const [months, setMonths] = useState<MonthData[]>([]);
    const [selectedMonth, setSelectedMonth] = useState<MonthData | null>(null);
    const [daysInMonth, setDaysInMonth] = useState<DayData[]>([]);
    const [selectedDay, setSelectedDay] = useState<DayData | null>(null);

    // Fetch records from the database when the component mounts
    // This function retrieves all future due records, deduplicates them by tag, and processes them to get unique months with counts.
    useEffect(() => {
        const fetchRecords = async () => {
            try {
                const allRecords = await getAllFutureDueRecords(db);
                
                // Create a Map to store the most recent record for each tag
                const tagMap = new Map<string, RecordType>();
                allRecords.forEach(record => {
                    const existingRecord = tagMap.get(record.tag);
                    if (!existingRecord || new Date(record.date!) > new Date(existingRecord.date!)) {
                        tagMap.set(record.tag, record);
                    }
                });
                
                // Convert Map values back to array
                const dedupedRecords = Array.from(tagMap.values());
                setRecords(dedupedRecords);
                
                // Process records to get unique months with counts
                const monthMap = new Map<string, MonthData>();
                
                dedupedRecords.forEach(record => {
                    if (record.due_date) {
                        const date = new Date(record.due_date);
                        const monthKey = `${date.getFullYear()}-${date.getMonth()}`;
                        const monthStr = date.toLocaleString('default', { month: 'long', year: 'numeric' });
                        
                        if (!monthMap.has(monthKey)) {
                            monthMap.set(monthKey, {
                                monthStr,
                                month: date.getMonth(),
                                year: date.getFullYear(),
                                count: 1
                            });
                        } else {
                            const data = monthMap.get(monthKey)!;
                            data.count++;
                        }
                    }
                });

                // Convert map to sorted array
                const monthArray = Array.from(monthMap.values())
                    .sort((a, b) => {
                        if (a.year !== b.year) return a.year - b.year;
                        return a.month - b.month;
                    });
                
                setMonths(monthArray);
            } catch (error) {
                console.error("Error fetching records:", error);
            }
        };

        fetchRecords();
    }, []);

    // Handlers for month and day selection
    const handleMonthSelect = (month: MonthData) => {
        setSelectedMonth(month);
        setSelectedDay(null);

        // Process records for the selected month
        const daysMap = new Map<number, DayData>();
        
        records.forEach(record => {
            if (record.due_date) {
                const date = new Date(record.due_date);
                if (date.getMonth() === month.month && date.getFullYear() === month.year) {
                    const day = date.getDate();
                    if (!daysMap.has(day)) {
                        daysMap.set(day, {
                            day,
                            count: 1,
                            records: [record]
                        });
                    } else {
                        const data = daysMap.get(day)!;
                        data.count++;
                        data.records.push(record);
                    }
                }
            }
        });

        // Convert map to sorted array
        const daysArray = Array.from(daysMap.values())
            .sort((a, b) => a.day - b.day);
        
        setDaysInMonth(daysArray);
    };

    // Handler for day selection
    const handleDaySelect = (day: DayData) => {
        setSelectedDay(day);
    };

    // Helper function to get ordinal suffix for a number
    const getOrdinalSuffix = (day: number): string => {
        const j = day % 10;
        const k = day % 100;
        if (j === 1 && k !== 11) return day + "st";
        if (j === 2 && k !== 12) return day + "nd";
        if (j === 3 && k !== 13) return day + "rd";
        return day + "th";
    };

    const styles = StyleSheet.create({
        container: {
            flex: 1,
            flexDirection: 'row',
            width: '100%',
            backgroundColor: colors.bgColor,
            marginTop: 20,
        },
        column: {
            flex: 1,
            borderRightWidth: 1,
            borderColor: colors.thrdColor,
            height: '100%',
        },
        columnHeader: {
            padding: 5,  // Reduced from 10
            backgroundColor: colors.buttonColor,
            borderBottomWidth: 1,
            borderColor: colors.thrdColor,
        },
        headerText: {
            color: colors.bgColor,
            fontSize: 18,
            fontWeight: 'bold',
            textAlign: 'center',
        },
        scrollView: {
            flex: 1,
        },
        item: {
            padding: 7,  // Reduced from 15
            borderBottomWidth: 1,
            borderColor: colors.thrdColor,
        },
        dateRow: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
        },
        selectedItem: {
            backgroundColor: colors.buttonColor,
        },
        itemText: {
            fontSize: 16,
            color: colors.fgColor,
        },
        selectedItemText: {
            color: colors.bgColor,
        },
        count: {
            fontSize: 14,
            color: colors.scndColor,
            marginTop: 5,
        },
        selectedCount: {
            color: colors.bgLightColor,
        },
    });

    // for (let record of records) {
    //     console.log("Record:", record);
    //     console.log(" ");
    // }

    return (
        <View style={styles.container}>
            {/* Months Column */}
            <View style={styles.column}>
                <View style={styles.columnHeader}>
                    <Text style={styles.headerText}>Month</Text>
                </View>
                <ScrollView style={styles.scrollView}>
                    {months.map((month, index) => (
                        <TouchableOpacity
                            key={index}
                            style={[
                                styles.item,
                                selectedMonth?.monthStr === month.monthStr && styles.selectedItem
                            ]}
                            onPress={() => handleMonthSelect(month)}
                        >
                            <Text style={[
                                styles.itemText,
                                selectedMonth?.monthStr === month.monthStr && styles.selectedItemText
                            ]}>
                                {month.monthStr}
                            </Text>
                            <Text style={[
                                styles.count,
                                selectedMonth?.monthStr === month.monthStr && styles.selectedCount
                            ]}>
                                {month.count} records
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>

            {/* Days Column */}
            <View style={styles.column}>
                <View style={styles.columnHeader}>
                    <Text style={styles.headerText}>Date</Text>
                </View>
                <ScrollView style={styles.scrollView}>
                    {daysInMonth.map((day, index) => (
                        <TouchableOpacity
                            key={index}
                            style={[
                                styles.item,
                                selectedDay?.day === day.day && styles.selectedItem
                            ]}
                            onPress={() => handleDaySelect(day)}
                        >
                            <View style={styles.dateRow}>
                                <Text style={[
                                    styles.itemText,
                                    selectedDay?.day === day.day && styles.selectedItemText
                                ]}>
                                    {getOrdinalSuffix(day.day)}
                                </Text>
                                <Text style={[
                                    styles.count,
                                    selectedDay?.day === day.day && styles.selectedCount,
                                    { marginTop: 0 }  // Remove top margin since items are side by side
                                ]}>
                                    {day.count} due
                                </Text>
                            </View>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>

            {/* Tags Column */}
            <View style={styles.column}>
                <View style={styles.columnHeader}>
                    <Text style={styles.headerText}>Tags Due</Text>
                </View>
                <ScrollView style={styles.scrollView}>
                    {selectedDay?.records.map((record, index) => (
                        <View key={index} style={styles.item}>
                            <Text style={styles.itemText}>
                                {record.tag}
                            </Text>
                            {record.note && (
                                <Text style={styles.count}>
                                    {record.note}
                                </Text>
                            )}
                        </View>
                    ))}
                </ScrollView>
            </View>

            {/* Floating Home Button */}
            <TouchableOpacity
                style={{
                    position: 'absolute',
                    bottom: 20,
                    right: 20,
                    backgroundColor: colors.buttonColor,
                    borderRadius: 30,
                    width: 60,
                    height: 60,
                    justifyContent: 'center',
                    alignItems: 'center',
                    elevation: 5,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.25,
                    shadowRadius: 3.84,
                }}
                onPress={() => router.push("/")}
                activeOpacity={0.8}
            >
                <Feather name="home" size={30} color={colors.bgColor} />
            </TouchableOpacity>
        </View>
    );
};

export default DueDateDisplay;