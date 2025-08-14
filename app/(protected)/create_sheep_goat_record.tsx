import {
    Keyboard, Text, TouchableOpacity, ScrollView,
    TouchableWithoutFeedback, View, Platform, KeyboardAvoidingView, Animated,
    TextInput
} from "react-native";
import Navbar from "@/components/Navbar";
import ModalConfirm from "@/components/ModalConfirm";
import TagInput from "@/components/TagInput";
import Button from "@/components/Button";
import DateOrDuration from "@/components/DateOrDuration";
import { useTheme } from "@/hooks/useTheme";
import { usePersistRecord, useRecord } from "@/contexts/RecordContext";
import { useRecordSync } from "@/contexts/RecordSyncContext";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState, useRef } from "react";

// Import the icons needed for the stats bar
import SheepHeadshotIcon from '@/assets/icons/SheepsHeadIcon';
import SheepLambHeadshotIcon from '@/assets/icons/SheepLambHeadIcon';
import GoatHeadshotIcon from '@/assets/icons/GoatsHeadIcon';
import GoatKidHeadshotIcon from '@/assets/icons/GoatKidHeadIcon';

import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import SegmentedControl from "@/components/SegmentedControl";



// Component for creating and editing sheep/goat pregnancy records
const CreateSheepGoatRecord = () => {

    const tagInputRef = useRef<TextInput>(null);

    const record = useRecord();
    const router = useRouter();
    const { isOnline } = useRecordSync();
    const { colors, baseStyle } = useTheme();

    // Check if we're editing an existing record by presence of tag in URL params
    const { tag } = useLocalSearchParams<{ tag?: string }>();
    const { commitRecord, handleFinished, checkDuplicateTag,
        recallRecord, recordCount } = usePersistRecord();

    // UI state management
    const [dueDate, setDueDate] = useState('');
    const [tagIsDuplicate, setTagIsDuplicate] = useState(false);
    const [tagSupplied, setTagSupplied] = useState(false);
    const [editing, setEditing] = useState(!!tag); // True if editing existing record
    const [showMessage, setShowMessage] = useState(false);
    const [showModal, setShowModal] = useState(false);

    // Animations for success feedback
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const screenDarkAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (tag) {
            const fetchedRecord = recallRecord(tag);

            // Use a functional state update to ensure we're working with the latest state
            setRecordData(prevData => {
                const newData = {
                    tag: fetchedRecord.tag,
                    time_pregnant: fetchedRecord.days_pregnant || 0,
                    calf_count: fetchedRecord.calf_count || 0,
                    note: fetchedRecord.note || '',
                    pregnant: fetchedRecord.pregnancy_status || false,
                };
                return newData;
            });

            setTagSupplied(true);

            // Force update by setting editing state
            setEditing(true);
        } else {
            setTagSupplied(false);
            setEditing(false);
        }
    }, [tag, recallRecord])



    // Local state to manage form data
    const [recordData, setRecordData] = useState({
        tag: '',
        time_pregnant: 0,
        calf_count: 0,
        pregnant: false,
        note: '',
    });


    // Calculate due date based on insemination date and time pregnant
    useEffect(() => {
        const offsetDays = (record.gestation_days ?? 0) - recordData.time_pregnant;
        const dueDate = new Date(Date.now() + offsetDays * 24 * 60 * 60 * 1000);

        // Format date as "Jan 24th, 2025"
        const options: Intl.DateTimeFormatOptions = {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        };
        let formattedDate = dueDate.toLocaleDateString('en-US', options);

        // Add suffix to day (st, nd, rd, th)
        const day = dueDate.getDate();
        let suffix = 'th';
        if (day % 10 === 1 && day !== 11) suffix = 'st';
        else if (day % 10 === 2 && day !== 12) suffix = 'nd';
        else if (day % 10 === 3 && day !== 13) suffix = 'rd';

        // Replace the numeric day with day + suffix
        formattedDate = formattedDate.replace(/\b\d+\b/, day + suffix);

        setDueDate(formattedDate);
    }, [recordData.time_pregnant]);



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


    // Handle "Next" button click
    const handleNextClicked = () => {
        storeRecord();
        setRecordData({
            tag: '',
            time_pregnant: 0,
            calf_count: 0,
            pregnant: false,
            note: '',
        });

        // If editing, return to normal mode (creating new records)
        if (editing) {
            setEditing(false);
            router.replace('/create_sheep_goat_record');
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

        // Focus on tag input field for next entry
        tagInputRef.current?.focus();
    }

    // Store record to context and local database
    const storeRecord = () => {

        // Convert time to days based on selected unit
        let adjustedTime = recordData.time_pregnant;
        // if (record.time_unit === 'months') {
        //     adjustedTime *= 30;
        // } else if (record.time_unit === 'weeks') {
        //     adjustedTime *= 7;
        // }
        commitRecord({
            ...record,
            tag: recordData.tag,
            days_pregnant: adjustedTime,
            calf_count: recordData.calf_count,
            pregnancy_status: recordData.calf_count > 0,
            note: recordData.note,
        });
    }

    // Handle "Finish" button click to complete the session
    const handleFinishClicked = () => {

        handleFinished();
        setRecordData({
            tag: '',
            time_pregnant: 0,
            calf_count: 0,
            pregnant: false,
            note: '',
        });

        // Navigate to summary screen
        if (recordCount > 0) {
            router.replace('/preg_summary_sheep_goat');
        } else {
            router.replace('/');
        }
    }

    const handlePreviousClicked = () => {
        if (record.animal) {
            router.replace(`/preg_tag_list?animal=${record.animal}`);
        } else {
            console.error("Animal type is undefined");
        }
    }

    const onShowConfirmFinishModal = () => {
        setShowModal(true);
    }

    // Visual state for UI elements
    const tagIsValid = tagSupplied && !tagIsDuplicate;
    const pregnancyValid = (recordData.pregnant && recordData.calf_count > 0) || !recordData.pregnant;

    // Calculate validation values for pregnancy duration
    const currentGestationDays = record.gestation_days || 0;

    // Allow for entry up to 20% more than standard gestation period
    let maxTimePregnant = Math.floor(currentGestationDays * 1.2);

    // Validation flags
    const gestationTooHigh = recordData.time_pregnant > maxTimePregnant;
    const nextButtonDisabled = !pregnancyValid || !tagIsValid || gestationTooHigh;

    // Get statistics for display in the stats bar
    const { getStats } = usePersistRecord();

    return (
        <View style={{
            flex: 1,
            justifyContent: "flex-start",
            alignItems: "center",
            backgroundColor: colors.bgColor,
            position: "relative",
        }}>
            <Navbar title="Preg Check" subTitle="Calculator" />

            {/* Edit previous animal button overlaying navbar */}
            <TouchableOpacity
                onPress={handlePreviousClicked}
                disabled={editing}
                style={{
                    position: 'absolute',
                    right: 10,
                    top: 40, // Vertically centered on navbar
                    zIndex: 100,
                    opacity: editing ? 0.2 : 1,
                    transform: [{ scale: 0.7 }], // Reduce size by 50%
                }}
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



            <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
                <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
                    <ScrollView
                        contentContainerStyle={{
                            flexGrow: 1,
                            justifyContent: "flex-start",
                            alignItems: "center",
                            backgroundColor: colors.bgColor,
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
                        />

                        {/* Offspring count slider section */}
                        <View style={{
                            width: "100%", // Full screen width
                            flexDirection: "row",
                            alignItems: "center",
                            justifyContent: "flex-start",
                            marginTop: 20,
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
                                {record.animal === 'S' ? 'Lamb' : 'Kid'} Count
                            </Text>

                            <View style={{ width: "55%" }}>
                                <SegmentedControl
                                    options={['0', '1', '2', '3', '4', '5']}
                                    selectedOption={recordData.calf_count.toString()}
                                    onSelect={(value) => {
                                        setRecordData({
                                            ...recordData,
                                            calf_count: parseInt(value),
                                            time_pregnant: parseInt(value) === 0 ? 0 : recordData.time_pregnant,
                                        });
                                    }}
                                    fgColor={colors.brgtColor}
                                    bgColor={colors.bgColor}
                                    buttonStyleSelected={{
                                        fontSize: 18,
                                        paddingHorizontal: 10,
                                    }}
                                    buttonStyleUnselected={{
                                        fontSize: 16,
                                        paddingHorizontal: 8,
                                    }}
                                />
                            </View>
                        </View>


                        {/* Pregnancy duration section */}
                        <DateOrDuration
                            duration={recordData.time_pregnant}
                            durationUnit={record.time_unit ?? 'days'}
                            onDurationChange={(days) => {
                                setRecordData({
                                    ...recordData,
                                    time_pregnant: days,
                                });
                            }}
                            disabled={recordData.calf_count <= 0}
                            durationTooHigh={gestationTooHigh}
                            maxDuration={maxTimePregnant}
                        />




                        {/* Note and Next Animal buttons */}
                        <View style={{
                            flex: 1,
                            flexDirection: "row",
                            justifyContent: "center",
                            alignItems: 'center',
                            width: "100%",
                        }}>

                            {/* Add Note Text Field */}
                            <View style={{
                                width: "100%", // Full screen width
                                alignItems: "center",
                                justifyContent: "flex-start",
                                flexDirection: "row",
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
                                    />
                                </View>
                            </View>
                        </View>

                        {/* Due date display */}
                        <Text
                            style={{
                                color: colors.fgColor,
                                fontSize: 20,
                                fontWeight: "bold",
                                textAlign: 'center',
                                width: '100%',
                                opacity: recordData.calf_count <= 0 || recordData.time_pregnant <= 0 ? 0 : 1,
                            }}
                        >
                            This {record.animal === 'S' ? 'sheep' : 'goat'} is due on {dueDate}
                        </Text>

                        {/* Next Animal button */}
                        <View style={{
                            flex: 1,
                            flexDirection: "row",
                            justifyContent: "center",
                            alignItems: 'center',
                            width: "100%",
                        }}>
                            <Button
                                onPress={handleNextClicked}
                                title="Next Animal"
                                style={{ marginTop: 10 }}
                                disabled={nextButtonDisabled}
                            ></Button>
                        </View>

                        {/* Confirmation modal for finishing the session */}
                        <ModalConfirm
                            title="Are you sure?"
                            message="This will end this recording session and email your data to you."
                            onConfirm={handleFinishClicked}
                            onCancel={() => setShowModal(false)}
                            modalVisible={showModal}
                        />

                        {/* Stats bar and Finish button */}
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
                            {/* Show the appropriate animal icon based on the animal type */}
                            {record.animal === 'S' ? (
                                <SheepHeadshotIcon
                                    width={36}
                                    height={36}
                                    color={colors.fgColor}
                                />
                            ) : (
                                <GoatHeadshotIcon
                                    width={36}
                                    height={36}
                                    color={colors.fgColor}
                                />
                            )}
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
                            >
                                {getStats().total}
                            </Text>

                            {/* Show the appropriate offspring icon based on the animal type */}
                            {record.animal === 'S' ? (
                                <SheepLambHeadshotIcon
                                    width={36}
                                    height={36}
                                    color={colors.fgColor}
                                />
                            ) : (
                                <GoatKidHeadshotIcon
                                    width={36}
                                    height={36}
                                    color={colors.fgColor}
                                />
                            )}
                            <Text
                                style={{
                                    color: colors.fgColor,
                                    fontSize: 20,
                                    fontWeight: "bold",
                                    padding: 10,
                                    textAlign: 'center',
                                    borderRightWidth: 1,
                                    borderRightColor: colors.fgColor,
                                }}
                            >
                                {getStats().total > 0
                                    ? `${Math.round(getStats().pregnant / getStats().total * 100)}%`
                                    : '0%'}
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
                            />
                        </LinearGradient>

                    </ScrollView>
                </TouchableWithoutFeedback>
            </KeyboardAvoidingView>



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
                        zIndex: 11, // Above the darkened overlay
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

        </View >

    );
}

export default CreateSheepGoatRecord;