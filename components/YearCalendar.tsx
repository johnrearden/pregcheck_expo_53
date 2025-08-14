import { HEATMAP_COLORS } from "@/constants/constants";
import { useTheme } from "@/hooks/useTheme";
import { useState } from "react";
import React, { StyleSheet, Text, View } from "react-native";

export interface YearCalendarProps {
    year: number,
    session_id?: number,
    dates?: Map<Date, number>,
    yearStyle?: object,
    monthStyle?: object,
    cellStyle?: object,
    textStyle?: object,
}

export interface MonthCalendarProps {
    year: number;
    month: number;
    dates?: number[];
    dueCountByDay: number[];
    maxPerDay: number;
    monthStyle?: object,
    cellStyle?: object,
    textStyle?: object,
}

export const MonthCalendar = (props: MonthCalendarProps) => {
    const { year, month, monthStyle, dates, dueCountByDay, maxPerDay } = props;
    const { colors } = useTheme();

    const [cellList, setCellList] = useState<number[]>(
        () => {
            const firstDayOfMonth = new Date(year, month, 1);
            const lastDayOfMonth = new Date(year, month + 1, 0);
            const daysInMonth = lastDayOfMonth.getDate();
            const array = new Array(42).fill(0);
            const startIndex = firstDayOfMonth.getDay();
            const endIndex = startIndex + daysInMonth;
            for (let i = startIndex; i < endIndex; i++) {
                array[i] = i - startIndex + 1;
            }
            return array;
        }
    );

    const styles = StyleSheet.create({
        container: {
            padding: 1,
            width: '100%',
            borderWidth: 1,
        },
        row: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            width: '100%',
        },
        cell: {
            flex: 1,
            aspectRatio: 1,
            margin: 1,
            alignItems: 'center',
            justifyContent: 'center',
        },
        text: {
            color: colors.fgColor,
            fontSize: 9,
        },
    });

    return (
        <View style={monthStyle}>

            <Text
                style={{
                    color: colors.bgColor,
                    backgroundColor: colors.scndColor,
                    padding: 2,
                    textAlign: 'center',
                    fontSize: 12,
                    fontWeight: 'bold',
                }}
            >
                {new Date(year, month).toLocaleString('default', { month: 'short' })}
            </Text>
            <View style={[styles.row]}>
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => (
                    <View style={{
                        flex: 1,
                        aspectRatio: 1,
                        margin: 2,
                        alignItems: 'center',
                        justifyContent: 'center',
                    }} key={index}>
                        <Text
                            key={index}
                            style={[
                                styles.text, { fontWeight: 'bold' }]}
                        >
                            {day}
                        </Text>
                    </View>
                ))}
            </View>

            {Array.from({ length: 6 }).map((_, rowIdx) => (
                <View key={rowIdx} style={styles.row}>
                    {Array.from({ length: 7 }).map((_, colIdx) => {
                        const dayIndex = rowIdx * 7 + colIdx;
                        const isDueDate = dates?.includes(dayIndex - 1);
                        let color;
                        if (isDueDate) {
                            const dueCount = dueCountByDay[dayIndex - 1];
                            const colorIndex = Math.floor((dueCount / maxPerDay) * 10);
                            color = HEATMAP_COLORS[colorIndex];
                        } else {
                            color = colors.bgLightColor;
                        }
                        return (
                            <View
                                key={colIdx}
                                style={[styles.cell, {
                                    backgroundColor: color,

                                }]}
                            >
                                <Text
                                    style={[
                                        styles.text,
                                        { color: isDueDate ? colors.bgColor : colors.fgColor }
                                    ]}
                                >
                                    {cellList[dayIndex] === 0 ? '' : cellList[dayIndex]}
                                </Text>
                            </View>
                        );
                    })}
                </View>
            ))}
        </View>
    )
}

const YearCalendar = (props: YearCalendarProps) => {
    const { year, dates } = props;
    const { baseStyle, colors } = useTheme();

    // Add the dates for each month to an dictionary of lists
    const datesByMonth: number[][] = Array.from({ length: 12 }, () => []);

    // Create a parallel array to hold the number of animals due on each day.
    // Fill with 0s
    const dueCountByDay: number[][] = Array.from({ length: 12 }, () => []);
    for (let i = 0; i < 12; i++) {
        dueCountByDay[i] = Array.from({ length: 31 }, () => 0);
    }

    // Iterate through the keys in the dates map
    // and add the day of the month to the corresponding month 
    let maxPerDay = 0;
    for (const key of dates?.keys() || []) {
        const month = key.getMonth();
        const day = key.getDate();
        datesByMonth[month].push(day);
        dueCountByDay[month][day] += 1;
        if (dueCountByDay[month][day] > maxPerDay) {
            maxPerDay = dueCountByDay[month][day]
        }
    }
    

    // Track which quarters contain dates
    const quartersToShow: number[] = [];
    datesByMonth.forEach((month, index) => {
        if (month.length > 0) {
            const quarter = Math.floor(index / 3);
            if (!quartersToShow.includes(quarter)) {
                quartersToShow.push(quarter);
            }
        }
    });


    return (
        <View>
            <Text
                style={{
                    fontSize: 20,
                    fontWeight: 'bold',
                    color: colors.fgColor,
                    textAlign: 'center',
                    marginVertical: 10
                }}
            >Due Dates in {year}</Text>
            
            {/* Only render quarters that have dates */}
            {Array.from({ length: 4 }).map((_, rowIdx) => {
                // Skip this quarter if it's not in quartersToShow
                if (!quartersToShow.includes(rowIdx)) {
                    return null;
                }
                
                return (
                    <View key={rowIdx}
                        style={{
                            flexDirection: 'row',
                            justifyContent: 'space-between',
                            marginVertical: 5,
                        }}>
                        {Array.from({ length: 3 }).map((_, colIdx) => {
                            const monthIndex = rowIdx * 3 + colIdx;
                            return (
                                <MonthCalendar
                                    key={colIdx}
                                    year={year}
                                    month={monthIndex}
                                    dates={datesByMonth[monthIndex]}
                                    dueCountByDay={dueCountByDay[monthIndex]}
                                    maxPerDay={maxPerDay}
                                    monthStyle={{ 
                                        backgroundColor: colors.bgLightColor, 
                                        width: '31%',
                                        borderWidth: 1,
                                        borderColor: colors.scndColor,
                                        borderRadius: 5,
                                    }}
                                    cellStyle={{}}
                                />
                            );
                        })}
                    </View>
                );
            })}
        </View>
    )
}

export default YearCalendar;