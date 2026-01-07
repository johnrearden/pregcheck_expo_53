import {
    View, TouchableWithoutFeedback, Keyboard, TouchableOpacity,
    Text, ScrollView, Platform, KeyboardAvoidingView, Animated,
    TextInput
} from 'react-native';
import React, { useEffect, useState, useRef } from 'react';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import DateTimePicker from '@react-native-community/datetimepicker';
import Navbar from "@/components/Navbar";
import Button from "@/components/Button";
import ModalConfirm from '@/components/ModalConfirm';
import TagInput from '@/components/TagInput';
import { useTheme } from '@/hooks/useTheme';
import { useHeatRecord, useHeatRecordMethod } from '@/contexts/HeatRecordContext';
import { useRecordSync } from '@/contexts/RecordSyncContext';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import CowHeadshotIcon from '@/assets/icons/CowHeadshotIcon';

// Default estrus cycle length for cattle (days)
const ESTRUS_CYCLE_DAYS = 21;

// Component for creating and editing heat records
const CreateHeatRecord = () => {

    const tagInputRef = useRef<TextInput>(null);

    const router = useRouter();
    const { isOnline } = useRecordSync();

    const heatRecord = useHeatRecord();
    const {
        commitRecord, handleFinished, recordCount,
        checkDuplicateTag, recallRecord, getStats } = useHeatRecordMethod();
    const { baseStyle, colors } = useTheme();

    // Check if we're editing an existing record by presence of tag in URL params
    const { tag } = useLocalSearchParams<{ tag?: string }>();

    useEffect(() => {
        if (tag) {
            const fetchedRecord = recallRecord(tag);

            setRecordData(prevData => {
                const newData = {
                    tag: fetchedRecord.tag,
                    heat_date: fetchedRecord.heat_date || new Date().toISOString().split('T')[0],
                    note: fetchedRecord.note || '',
                };
                return newData;
            });

            setTagSupplied(true);
            setEditing(true);
        } else {
            setTagSupplied(false);
            setEditing(false);
        }
    }, [tag, recallRecord]);

    // Local state to manage form data
    const [recordData, setRecordData] = useState({
        tag: '',
        heat_date: new Date().toISOString().split('T')[0],
        note: '',
    });

    // UI state management
    const [showMessage, setShowMessage] = useState(false);
    const [tagIsDuplicate, setTagIsDuplicate] = useState(false);
    const [tagSupplied, setTagSupplied] = useState(false);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [editing, setEditing] = useState(!!tag);
    const [confirmModalVisible, setConfirmModalVisible] = useState(false);

    // Animations for success feedback
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const screenDarkAnim = useRef(new Animated.Value(0)).current;

    // Calculate next heat date (heat_date + 21 days)
    const calculateNextHeatDate = (heatDate: string): string => {
        const date = new Date(heatDate);
        date.setDate(date.getDate() + ESTRUS_CYCLE_DAYS);
        return date.toISOString().split('T')[0];
    };

    // Format date for display
    const formatDisplayDate = (dateString: string): string => {
        const date = new Date(dateString);
        const options: Intl.DateTimeFormatOptions = {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        };
        let formattedDate = date.toLocaleDateString('en-US', options);

        // Add suffix to day (st, nd, rd, th)
        const day = date.getDate();
        let suffix = 'th';
        if (day % 10 === 1 && day !== 11) suffix = 'st';
        else if (day % 10 === 2 && day !== 12) suffix = 'nd';
        else if (day % 10 === 3 && day !== 13) suffix = 'rd';

        formattedDate = formattedDate.replace(/\b\d+\b/, day + suffix);
        return formattedDate;
    };

    // Handle tag input changes and validate for duplicates
    const handleTagChange = (value: string) => {
        if (value && value.length > 0) {
            const isDuplicate = checkDuplicateTag(value);
            setTagIsDuplicate(isDuplicate);
            setTagSupplied(true);
        } else {
            setTagSupplied(false);
            setTagIsDuplicate(false);
        }
        setRecordData({
            ...recordData,
            tag: value || '',
        });
    }

    // Handle "Heat Today" button press
    const handleHeatToday = () => {
        const today = new Date().toISOString().split('T')[0];
        setRecordData({
            ...recordData,
            heat_date: today,
        });
    }

    // Handle date picker change
    const handleDateChange = (event: any, selectedDate?: Date) => {
        if (Platform.OS === 'android') {
            setShowDatePicker(false);
        }
        if (selectedDate) {
            const dateString = selectedDate.toISOString().split('T')[0];
            setRecordData({
                ...recordData,
                heat_date: dateString,
            });
        }
    };

    // Store record to context and local database
    const storeRecord = () => {
        const nextHeatDate = calculateNextHeatDate(recordData.heat_date);
        commitRecord({
            ...heatRecord,
            tag: recordData.tag,
            heat_date: recordData.heat_date,
            next_heat_date: nextHeatDate,
            note: recordData.note,
        });
    }

    // Handle "Next" button click
    const handleNextClicked = () => {
        storeRecord();
        // Reset form for next animal
        setRecordData({
            tag: '',
            heat_date: new Date().toISOString().split('T')[0],
            note: '',
        });

        if (editing) {
            setEditing(false);
            router.push('/create_heat_record');
        } else {
            // Show temporary success message and darken screen
            setShowMessage(true);
            setTagSupplied(false);

            // Reset animations to initial values
            fadeAnim.setValue(1);
            screenDarkAnim.setValue(0.65);

            // Dark screen for 1 second then fade out over 0.5 seconds
            Animated.sequence([
                Animated.delay(1000),
                Animated.parallel([
                    Animated.timing(screenDarkAnim, {
                        toValue: 0,
                        duration: 500,
                        useNativeDriver: true,
                    }),
                    Animated.timing(fadeAnim, {
                        toValue: 0,
                        duration: 500,
                        useNativeDriver: true,
                    }),
                ])
            ]).start(() => {
                setShowMessage(false);
            });
        }
        tagInputRef.current?.focus();
    }

    // Handle "Finish" button click to complete the session
    const handleFinishClicked = async () => {
        handleFinished();

        // Reset form data
        setRecordData({
            tag: '',
            heat_date: new Date().toISOString().split('T')[0],
            note: '',
        });

        // Navigate to summary screen
        if (recordCount > 0) {
            router.replace('/heat_summary');
        } else {
            router.replace('/');
        }
    }

    const handlePreviousClicked = () => {
        router.push('/heat_tag_list');
    }

    const onShowConfirmFinishModal = () => {
        setConfirmModalVisible(true);
    }

    // Validation flags
    const nextButtonDisabled = tagIsDuplicate || !tagSupplied;

    return (
        <View
            style={{
                flex: 1,
                justifyContent: "flex-start",
                alignItems: "center",
                backgroundColor: colors.bgColor,
                position: "relative",
            }}
        >
            <Navbar title="Heat Check" subTitle="Recording" />

            {/* Edit previous animal button overlaying navbar */}
            <TouchableOpacity
                onPress={handlePreviousClicked}
                disabled={editing}
                style={{
                    position: 'absolute',
                    right: 10,
                    top: 40,
                    zIndex: 100,
                    opacity: editing ? 0.2 : 1,
                    transform: [{ scale: 0.7 }],
                }}
                testID="edit-previous-animal-button"
            >
                <MaterialIcons
                    style={[baseStyle.icon_button, { color: colors.thrdColor }]}
                    name="edit"
                />
            </TouchableOpacity>

            {editing && (
                <View
                    style={{
                        width: "100%",
                        alignItems: "center",
                        justifyContent: "center",
                        flexDirection: "row",
                        backgroundColor: colors.warnColor,
                    }}
                >
                    <Text style={{
                        color: colors.bgColor,
                        fontSize: 20,
                        padding: 10,
                        fontWeight: "bold",
                    }}>
                        Editing Record
                    </Text>
                </View>
            )}

            {/* Main content area with KeyboardAvoidingView */}
            <View style={{ flex: 1, width: "100%" }}>
                <KeyboardAvoidingView
                    behavior={Platform.OS === "ios" ? "padding" : undefined}
                    style={{ flex: 1 }}
                    keyboardVerticalOffset={-100}
                >
                    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
                        <ScrollView
                            contentContainerStyle={{
                                flexGrow: 1,
                                justifyContent: "flex-start",
                                alignItems: "center",
                                backgroundColor: colors.bgColor,
                                paddingBottom: 20,
                            }}
                            keyboardShouldPersistTaps="handled"
                            showsVerticalScrollIndicator={false}
                            showsHorizontalScrollIndicator={false}
                            style={{
                                flex: 1,
                                width: "100%",
                            }}
                        >

                            {/* Tag input section */}
                            <TagInput
                                tag={recordData.tag}
                                tagSupplied={tagSupplied}
                                tagIsDuplicate={tagIsDuplicate}
                                handleTagChange={handleTagChange}
                                ref={tagInputRef}
                                testID="heat-tag-input"
                            />

                            {/* Heat Today button */}
                            <View style={{
                                width: "100%",
                                alignItems: "center",
                                justifyContent: "center",
                                marginTop: 20,
                            }}>
                                <Button
                                    title="Heat Today"
                                    onPress={handleHeatToday}
                                    style={{ width: "60%" }}
                                    testID="heat-today-button"
                                />
                            </View>

                            {/* Enter Date button */}
                            <View style={{
                                width: "100%",
                                alignItems: "center",
                                justifyContent: "center",
                                marginTop: 15,
                            }}>
                                <Button
                                    title="Enter Date"
                                    onPress={() => setShowDatePicker(true)}
                                    outline
                                    style={{ width: "60%" }}
                                    testID="enter-date-button"
                                />
                            </View>

                            {/* Date picker (Android modal / iOS inline) */}
                            {showDatePicker && (
                                Platform.OS === 'ios' ? (
                                    <View style={{
                                        width: "100%",
                                        paddingHorizontal: 20,
                                        marginTop: 10,
                                    }}>
                                        <DateTimePicker
                                            value={new Date(recordData.heat_date)}
                                            mode="date"
                                            display="spinner"
                                            onChange={handleDateChange}
                                            maximumDate={new Date()}
                                            testID="heat-date-picker"
                                        />
                                        <Button
                                            title="Done"
                                            onPress={() => setShowDatePicker(false)}
                                            style={{ marginTop: 10 }}
                                        />
                                    </View>
                                ) : (
                                    <DateTimePicker
                                        value={new Date(recordData.heat_date)}
                                        mode="date"
                                        display="default"
                                        onChange={handleDateChange}
                                        maximumDate={new Date()}
                                        testID="heat-date-picker"
                                    />
                                )
                            )}

                            {/* Selected date display */}
                            <View style={{
                                width: "100%",
                                flexDirection: "row",
                                alignItems: "center",
                                justifyContent: "flex-start",
                                marginTop: 20,
                            }}>
                                <Text
                                    style={[
                                        baseStyle.label,
                                        {
                                            width: "40%",
                                            textAlign: "right",
                                            paddingRight: 10,
                                            fontSize: 18,
                                            fontWeight: 'bold',
                                        }
                                    ]}
                                    numberOfLines={1}
                                >
                                    Selected
                                </Text>
                                <Text style={{
                                    color: colors.brgtColor,
                                    fontSize: 18,
                                    fontWeight: 'bold',
                                }}>
                                    {formatDisplayDate(recordData.heat_date)}
                                </Text>
                            </View>

                            {/* Next heat date display */}
                            <Text
                                style={{
                                    color: colors.fgColor,
                                    fontSize: 20,
                                    fontWeight: "bold",
                                    marginTop: 20,
                                    textAlign: 'center',
                                    width: '100%',
                                }}
                            >
                                Next heat expected: {formatDisplayDate(calculateNextHeatDate(recordData.heat_date))}
                            </Text>

                            {/* Add Note Text Field */}
                            <View style={{
                                width: "100%",
                                flexDirection: "row",
                                alignItems: "center",
                                justifyContent: "flex-start",
                                marginTop: 20,
                            }}>
                                <Text
                                    style={[
                                        baseStyle.label,
                                        {
                                            width: "40%",
                                            textAlign: "right",
                                            paddingRight: 10,
                                            fontSize: 18,
                                            fontWeight: 'bold',
                                        }
                                    ]}
                                    numberOfLines={1}
                                >
                                    Add Note
                                </Text>
                                <View style={{ width: "55%" }}>
                                    <TextInput
                                        style={{
                                            width: "100%",
                                            padding: 10,
                                            borderWidth: 1,
                                            borderColor: colors.thrdColor,
                                            borderRadius: 10,
                                            color: colors.fgColor,
                                            backgroundColor: colors.bgLightColor,
                                        }}
                                        value={recordData.note}
                                        onChangeText={(text) => setRecordData({
                                            ...recordData,
                                            note: text
                                        })}
                                        multiline={true}
                                        numberOfLines={3}
                                        placeholder="Optional notes..."
                                        placeholderTextColor={colors.fgColor + '80'}
                                        testID="heat-note-input"
                                    />
                                </View>
                            </View>

                            {/* Next Animal button */}
                            <View style={{
                                flexDirection: "row",
                                justifyContent: "center",
                                alignItems: 'center',
                                width: "100%",
                                marginTop: 20,
                                marginBottom: 80,
                            }}>
                                <Button
                                    title="Next Animal"
                                    onPress={handleNextClicked}
                                    disabled={nextButtonDisabled}
                                    testID="heat-next-animal-button"
                                />
                            </View>

                            {/* Confirmation modal for finishing the session */}
                            <ModalConfirm
                                title="Are you sure?"
                                message="This will end this heat recording session."
                                onConfirm={handleFinishClicked}
                                onCancel={() => setConfirmModalVisible(false)}
                                modalVisible={confirmModalVisible}
                            />


                            {/* Stats bar and Finish button - positioned absolutely at bottom */}
                            <View style={{
                                position: 'absolute',
                                bottom: 0,
                                width: '100%',
                                zIndex: 5,
                                backgroundColor: colors.bgColor,
                            }}>
                                <LinearGradient
                                    colors={[colors.thrdColor, colors.thrdColor]}
                                    style={[{
                                        width: "100%",
                                        flexDirection: "row",
                                        justifyContent: "center",
                                        alignItems: 'center',
                                        borderTopWidth: 1,
                                        borderTopColor: colors.fgColor,
                                    }]}
                                >
                                    <CowHeadshotIcon
                                        width={36}
                                        height={36}
                                        color={colors.fgColor}
                                    />
                                    <Text
                                        style={{
                                            color: colors.fgColor,
                                            fontSize: 20,
                                            fontWeight: "bold",
                                            padding: 10,
                                            textAlign: 'center',
                                            borderRightWidth: 1,
                                            borderRightColor: colors.fgColor,
                                            marginRight: 10,
                                        }}
                                        testID="heat-stats-total"
                                    >
                                        {getStats().total}
                                    </Text>

                                    <Button
                                        title="End Session"
                                        onPress={onShowConfirmFinishModal}
                                        disabled={!nextButtonDisabled}
                                        style={{
                                            marginLeft: 20,
                                            marginTop: 10,
                                            marginBottom: 10,
                                        }}
                                        testID="heat-end-session-button"
                                    />
                                </LinearGradient>
                            </View>
                        </ScrollView>
                    </TouchableWithoutFeedback>
                </KeyboardAvoidingView>
            </View>



            {/* Screen darkening overlay */}
            {showMessage && (
                <Animated.View
                    style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: "black",
                        opacity: screenDarkAnim,
                        zIndex: 10,
                    }}
                />
            )}

            {/* Temporary success message */}
            {showMessage && (
                <Animated.View
                    style={{
                        position: "absolute",
                        top: 150,
                        width: "80%",
                        borderColor: isOnline ? colors.brgtColor : colors.warnColor,
                        borderWidth: 3,
                        backgroundColor: colors.bgLightColor,
                        padding: 15,
                        borderRadius: 10,
                        zIndex: 11,
                        opacity: fadeAnim,
                        alignItems: 'center',
                        shadowColor: "#000",
                        shadowOffset: { width: 0, height: 3 },
                        shadowOpacity: 0.4,
                        shadowRadius: 5,
                        elevation: 8,
                    }}
                >
                    <Text style={{
                        color: isOnline ? colors.brgtColor : colors.warnColor,
                        fontSize: 30,
                        fontWeight: "bold",
                        textAlign: 'center',
                    }}>
                        {isOnline ? "Record saved!" : "Offline. Record saved locally."}
                    </Text>
                </Animated.View>
            )}
        </View>
    )
}

export default CreateHeatRecord;
