import { View, Text, Platform, TouchableOpacity } from "react-native";
import NumberInput from "@/components/NumberInput";
// @ts-ignore
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import React, { useEffect, useState } from "react";
import { useTheme } from "@/hooks/useTheme";


export interface DateOrDurationProps {
    duration: number;
    durationUnit: "days" | "weeks" | "months";
    onDurationChange: (time: number) => void;
    disabled?: boolean;
    durationTooHigh?: boolean;
    maxDuration?: number;
    datePickerLabel?: string;
}


const DateOrDuration = (props: DateOrDurationProps) => {

    const { duration, durationUnit, onDurationChange,
        disabled, durationTooHigh, maxDuration, datePickerLabel } = props;
    const { baseStyle, colors } = useTheme();

    const [showDatePicker, setShowDatePicker] = useState(false);

    // Calculate the date based on the duration passed in and todays date
    const [date, setDate] = useState(() => new Date(Date.now() - duration * 24 * 60 * 60 * 1000));

    useEffect(() => {
        setDate(new Date(Date.now() - duration * 24 * 60 * 60 * 1000));
    }, [duration]);

    useEffect(() => {
        onDurationChange(0);
        setDate(new Date(Date.now()));
    }, [durationUnit]);

    const handleDateChange = (event: any, date: Date | undefined) => {
        if (date) {
            setDate(date);
            const days = Math.floor((new Date().getTime() - date.getTime()) / (1000 * 3600 * 24));
            onDurationChange(days);
        }
    }

    const handleDurationChange = (value: string) => {
        let actualDays = parseInt(value) || 0;
        if (durationUnit === 'weeks') {
            actualDays *= 7;
        } else if (durationUnit === 'months') {
            actualDays *= 30;
        }
        setDate(new Date(Date.now() - actualDays * 24 * 60 * 60 * 1000));
        onDurationChange(actualDays);
    }

    let adjustedDuration = duration;
    if (durationUnit === 'weeks') {
        adjustedDuration = Math.floor(duration / 7);
    } else if (durationUnit === 'months') {
        adjustedDuration = Math.floor(duration / 30);
    }

    let adjustedMaxDuration = maxDuration;
    if (durationUnit === 'weeks' && maxDuration) {
        adjustedMaxDuration = Math.floor(maxDuration / 7);
    } else if (durationUnit === 'months' && maxDuration) {
        adjustedMaxDuration = Math.floor(maxDuration / 30);
    }


    return (
        <>
            <View style={{
                marginTop: 20,
                display: "flex",
                alignItems: "center",
                flexDirection: "row",
                justifyContent: "flex-start",
                opacity: disabled ? 0.2 : 1,
                width: "100%", // Full screen width
            }}>
                <Text style={[
                    baseStyle.label, 
                    {
                        width: "40%", // Increase width to 40%
                        textAlign: "right",
                        paddingRight: 10,
                        fontSize: 18,
                        fontWeight: 'bold',
                    }
                ]}
                    numberOfLines={1}
                >
                    {datePickerLabel || 'Date'}
                </Text>
                <View style={{ width: "55%" }}>
                    {Platform.OS === 'android' && (
                        <TouchableOpacity
                            testID="android-date-picker-button"
                            disabled={disabled}
                            onPress={() => setShowDatePicker(true)}
                        >
                            <Text
                                style={{
                                    fontFamily: 'Nunito',
                                    fontSize: 18,
                                    color: colors.fgColor,
                                    borderRadius: 10,
                                    backgroundColor: colors.bgColor,
                                    borderColor: colors.thrdColor,
                                    borderWidth: 1,
                                    paddingHorizontal: 10,
                                    paddingVertical: 5,
                                }}
                                
                            >
                                {date.toLocaleDateString()}
                            </Text>
                        </TouchableOpacity>
                    )}

                    {(showDatePicker || Platform.OS === 'ios') && (
                        <DateTimePicker
                            value={date}
                            mode="date"
                            display="default"
                            onChange={(event: DateTimePickerEvent, date: Date | undefined) => {
                                handleDateChange(event, date);
                                setShowDatePicker(Platform.OS === 'ios');
                            }}
                            maximumDate={new Date()}
                            disabled={disabled}
                            testID="date-picker"
                        />
                    )}
                </View>
            </View>

            <View
                style={{
                    width: "100%", // Full screen width
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "flex-start",
                    marginTop: 20,
                    opacity: disabled ? 0.2 : 1,
                    pointerEvents: disabled ? "none" : "auto",
                }}>

                <Text
                    style={[
                        baseStyle.label, 
                        {
                            width: "40%", // Increase width to 40%
                            textAlign: "right",
                            paddingRight: 10,
                            fontSize: 18,
                            fontWeight: 'bold',
                        }
                    ]}
                    numberOfLines={1}
                >
                    {durationUnit[0].toUpperCase() + durationUnit.slice(1)}
                </Text>

                <View style={{ width: "55%" }}>
                    <View style={{
                        flexDirection: "row",
                        alignItems: "center",
                        position: "relative", // Added for absolute positioning of validation message
                        width: "100%",
                    }}>
                        <NumberInput
                            value={adjustedDuration}
                            onChange={handleDurationChange}
                            style={{ width: "100%", paddingRight: 80 }} // Added padding for validation message
                            testID="duration-input"
                        />
                        
                        {/* Validation message inside the input */}
                        <Text style={{ 
                            position: 'absolute',
                            right: 10,
                            fontSize: 14,
                            fontWeight: 'bold',
                            color: durationTooHigh ? colors.error : colors.success,
                        }}>
                            {durationTooHigh ? `${adjustedMaxDuration} max!` : "Valid"}
                        </Text>
                    </View>
                </View>
            </View>
        </>
    );
}

export default DateOrDuration;