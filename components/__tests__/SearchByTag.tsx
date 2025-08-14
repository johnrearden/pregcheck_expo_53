import React, { useState, useEffect, useRef } from 'react';
import { View, Text, ScrollView, Keyboard, Dimensions, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useTheme } from '@/hooks/useTheme';
import StringInput from '@/components/StringInput';
import RecordTable from '@/components/RecordTable';
import WeightRecordTable from '@/components/WeightRecordTable';
import { getRecordsByTag, getWeightRecordsByTag } from '@/utilities/DatabaseUtils';
import { Feather } from '@expo/vector-icons';

const screenHeight = Dimensions.get('window').height;

const SearchByTag = () => {
    const db = useSQLiteContext();
    const { colors, baseStyle } = useTheme();
    const [tag, setTag] = useState<string>("");
    const [records, setRecords] = useState<any[]>([]);
    const [weightRecords, setWeightRecords] = useState<any[]>([]);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);
    const router = useRouter();

    const handleTagChange = (value: string) => {
        setTag(value);
    }

    const retrieveRecords = async () => {
        const recs = await getRecordsByTag(db, tag);
        const weightRecs = await getWeightRecordsByTag(db, tag);
        setRecords(recs);
        setWeightRecords(weightRecs);
    }

    useEffect(() => {
        // Clear the previous timeout
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }

        // Set a new timeout
        timeoutRef.current = setTimeout(() => {
            Keyboard.dismiss();
            retrieveRecords();
        }, 1000); // debounce delay in ms

        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, [tag]);

    return (
        <View
            style={{
                flex: 1,
                justifyContent: "flex-start",
                alignItems: "center",
                backgroundColor: colors.bgColor,
                width: "100%",
                position: "relative", // Add this for positioning the floating button
            }}
        >
            <View style={{
                flexDirection: "row",
                justifyContent: "center",
                alignItems: "center",
                width: "100%",
                marginTop: 15,
            }}>
                <Text
                    style={baseStyle.label}>
                    Tag
                </Text>
                <View style={{
                    width: "40%",
                    marginLeft: 10,
                }}>
                    <StringInput
                        value={tag}
                        onChange={handleTagChange}
                        hideZero
                        numericOnly
                        testID="tag-input-field"
                    />
                </View>
            </View>
            <ScrollView
                style={{
                    flex: 1,
                    width: "100%",
                    height: screenHeight * 0.4,
                    paddingHorizontal: 20,
                    marginTop: 20,
                    overflow: "hidden",
                    borderTopWidth: 1,
                    borderBottomWidth: 1,
                    borderColor: colors.thrdColor,
                }}
                contentContainerStyle={{
                    justifyContent: "flex-start",
                    alignItems: "center",
                }}
                showsVerticalScrollIndicator={false}
                showsHorizontalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
            >
                <Text
                    style={{
                        fontSize: 20,
                        fontWeight: "bold",
                        color: colors.fgColor,
                        alignSelf: "flex-start",
                        marginTop: 10,
                    }}
                >Preg Scans</Text>
                {records.length > 0 ? (
                    <RecordTable
                        records={records}
                    />
                ) : (
                    <Text style={{
                        marginTop: 5,
                        fontSize: 16,
                        alignSelf: "flex-start"
                    }}>No Preg Scans Found</Text>
                )}

                <Text
                    style={{
                        fontSize: 20,
                        fontWeight: "bold",
                        color: colors.fgColor,
                        alignSelf: "flex-start",
                        marginTop: 30,
                    }}
                >Weight Scans</Text>

                {weightRecords.length > 0 ? (
                    <WeightRecordTable
                        records={weightRecords}
                    />
                ) : (
                    <Text style={{ 
                        marginTop: 5, 
                        fontSize: 16,
                        alignSelf: "flex-start" }}>No Records Found</Text>
                )}
            </ScrollView>

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
    )
}

export default SearchByTag;