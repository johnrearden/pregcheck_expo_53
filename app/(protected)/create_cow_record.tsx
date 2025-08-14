import {
   View, TouchableWithoutFeedback, Keyboard, TouchableOpacity,
   Text, ScrollView, Platform, KeyboardAvoidingView, Animated,
   TextInput
} from 'react-native';
import React, { useEffect, useState, useRef } from 'react';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import Navbar from "@/components/Navbar";
import Button from "@/components/Button";
import ModalConfirm from '@/components/ModalConfirm';
import TagInput from '@/components/TagInput';
import DateOrDuration from '@/components/DateOrDuration';
import { useTheme } from '@/hooks/useTheme';
import { usePersistRecord, useRecord } from '@/contexts/RecordContext';
import { useRecordSync } from '@/contexts/RecordSyncContext';
import { useLocalSearchParams, useRouter } from 'expo-router';
import SegmentedControl from '@/components/SegmentedControl';
import { LinearGradient } from 'expo-linear-gradient';
import CowHeadshotIcon from '@/assets/icons/CowHeadshotIcon';
import CowCalfHeadshotIcon from '@/assets/icons/CowCalfHeadshotIcon';


// Component for creating and editing cow pregnancy records
const CreateCowRecord = () => {

   const tagInputRef = useRef<TextInput>(null);

   const router = useRouter();
   const { isOnline } = useRecordSync();

   const record = useRecord();
   const {
      commitRecord, handleFinished, recordCount,
      checkDuplicateTag, recallRecord, getStats } = usePersistRecord();
   const { baseStyle, colors } = useTheme();

   // Check if we're editing an existing record by presence of tag in URL params
   const { tag } = useLocalSearchParams<{ tag?: string }>();

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
   }, [tag, recallRecord]);

   // Local state to manage form data
   const [recordData, setRecordData] = useState({
      tag: '',
      time_pregnant: 0,
      calf_count: 1,
      note: '',
   });

   const [dueDate, setDueDate] = useState('');

   // UI state management
   const [showMessage, setShowMessage] = useState(false);
   const [tagIsDuplicate, setTagIsDuplicate] = useState(false);
   const [tagSupplied, setTagSupplied] = useState(false);
   const [inseminationDate, setInseminationDate] = useState(new Date());
   const [editing, setEditing] = useState(!!tag); // True if editing existing record
   const [confirmModalVisible, setConfirmModalVisible] = useState(false);

   // Animations for success feedback
   const fadeAnim = useRef(new Animated.Value(0)).current;
   const screenDarkAnim = useRef(new Animated.Value(0)).current;


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


   // Store record to context and local database
   const storeRecord = () => {
      // Convert time to days based on selected unit
      let adjustedTime = recordData.time_pregnant;
      commitRecord({
         ...record,
         tag: recordData.tag,
         days_pregnant: adjustedTime,
         calf_count: recordData.calf_count,
         pregnancy_status: recordData.calf_count > 0,
         note: recordData.note,
      });
   }


   // Handle "Next" button click
   const handleNextClicked = () => {
      storeRecord();
      // Reset form for next animal
      setRecordData({
         tag: '',
         time_pregnant: 0,
         calf_count: 1,
         note: '',
      });

      // If editing, return to normal mode (creating new records)
      if (editing) {
         setEditing(false);
         router.push('/create_cow_record');
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
         time_pregnant: 0,
         calf_count: 1,
         note: '',
      });

      // Navigate to summary screen
      if (recordCount > 0) {
         router.replace('/preg_summary_cow');
      } else {
         router.replace('/');
      }

   }

   const handlePreviousClicked = () => {
      if (record.animal) {
         router.push(`/preg_tag_list?animal=${record.animal}`);
      } else {
         console.error("Animal type is undefined");
      }
   }

   const onShowConfirmFinishModal = () => {
      setConfirmModalVisible(true);
   }

   // Calculate validation values for pregnancy duration
   const currentGestationDays = record.gestation_days || 0;

   // Allow for entry up to 20% more than standard gestation period
   let maxTimePregnant = Math.floor(currentGestationDays * 1.2);

   // Validation flags
   const gestationTooHigh = recordData.time_pregnant > maxTimePregnant;
   const nextButtonDisabled = tagIsDuplicate || !tagSupplied || gestationTooHigh;

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
               // Don't avoid the bottom bar
               keyboardVerticalOffset={-100}
            >
               <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
                  <ScrollView
                     contentContainerStyle={{
                        flexGrow: 1,
                        justifyContent: "flex-start",
                        alignItems: "center",
                        backgroundColor: colors.bgColor,
                        paddingBottom: 20, // Add padding to ensure content is visible above stats bar
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
                        testID="pregnancy-tag-input"
                     />

                     {/* Status section - consistent with tag input */}
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
                           Status
                        </Text>
                        <View style={{}}>
                           <SegmentedControl
                              options={['Pregnant', 'Twins', 'Empty']}
                              selectedOption={
                                 (() => {
                                    if (recordData.calf_count === 2) {
                                       return 'Twins';
                                    } else if (recordData.calf_count === 0) {
                                       return 'Empty';
                                    } else if (recordData.calf_count === 1) {
                                       return 'Pregnant';
                                    } else {
                                       return '';
                                    }
                                 }
                                 )()
                              }
                              onSelect={(value) => {
                                 let calfCount = -1;
                                 if (value === 'Twins') {
                                    calfCount = 2;
                                 } else if (value === 'Empty') {
                                    calfCount = 0;
                                 } else if (value === 'Pregnant') {
                                    calfCount = 1;
                                 }

                                 if (value === 'Empty') {

                                    // Reset pregnancy duration for empty animals
                                    setInseminationDate(new Date());
                                    setRecordData({
                                       ...recordData,
                                       time_pregnant: 0,
                                       calf_count: calfCount,
                                    });
                                 } else {
                                    setRecordData({
                                       ...recordData,
                                       calf_count: calfCount
                                    });
                                 }
                              }}
                              containerStyle={{
                                 marginTop: 0,
                                 marginBottom: 0,
                              }}
                              buttonStyleSelected={{
                                 fontSize: 16,
                                 paddingHorizontal: 5
                              }}
                              buttonStyleUnselected={{
                                 fontSize: 16,
                                 paddingHorizontal: 5
                              }}
                              fgColor={colors.brgtColor}
                              bgColor={colors.bgColor}
                           />
                        </View>
                     </View>


                     {/* Pregnancy duration input section */}
                     <DateOrDuration
                        duration={recordData.time_pregnant}
                        durationUnit={record.time_unit ?? "days"}
                        onDurationChange={(days) => {
                           setRecordData({
                              ...recordData,
                              time_pregnant: days,
                           });
                        }}
                        disabled={recordData.calf_count <= 0}
                        durationTooHigh={gestationTooHigh}
                        maxDuration={maxTimePregnant}
                        datePickerLabel='Preg Date'
                     />

                     {/* Add Note Text Field - consistent with tag input */}
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
                              testID="pregnancy-note-input"
                           />
                        </View>
                     </View>

                     {/* Due date display */}
                     <Text
                        style={{
                           color: colors.fgColor,
                           fontSize: 20,
                           fontWeight: "bold",
                           marginTop: 20,
                           textAlign: 'center',
                           width: '100%',
                           opacity: recordData.calf_count <= 0 || recordData.time_pregnant <= 0 ? 0 : 1,
                        }}
                     >
                        This cow is due on {dueDate}
                     </Text>

                     {/* Next Animal button */}
                     <View style={{
                        flexDirection: "row",
                        justifyContent: "center",
                        alignItems: 'center',
                        width: "100%",
                        marginTop: 20,
                        marginBottom: 80, // Add extra bottom margin to ensure content is visible above stats bar
                     }}>
                        <Button
                           title="Next Animal"
                           onPress={handleNextClicked}
                           disabled={nextButtonDisabled}
                           testID="pregnancy-next-animal-button"
                        />
                     </View>

                     {/* Confirmation modal for finishing the session */}
                     <ModalConfirm
                        title="Are you sure?"
                        message="This will end this recording session and email your data to you."
                        onConfirm={handleFinishClicked}
                        onCancel={() => setConfirmModalVisible(false)}
                        modalVisible={confirmModalVisible}
                     />

                     
                     {/* Stats bar and Finish button - positioned absolutely at bottom */}
                     <View style={{
                        position: 'absolute',
                        bottom: 0,
                        width: '100%',
                        zIndex: 5, // Ensure it's above other content
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
                              testID="pregnancy-stats-total"
                           >
                              {getStats().total}
                           </Text>
                           <CowCalfHeadshotIcon
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
                              }}
                              testID="pregnancy-stats-pregnant-percentage"
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
                              testID="end-session-button"
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
      </View>
   )
}

export default CreateCowRecord;