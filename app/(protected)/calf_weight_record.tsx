import { useLocalSearchParams, useRouter } from "expo-router";
import {
   View, Text, TouchableWithoutFeedback, Keyboard, TouchableOpacity,
   ScrollView, KeyboardAvoidingView, Platform, Animated, StatusBar, TextInput
} from "react-native";
import { useTheme } from "@/hooks/useTheme";
import Navbar from "@/components/Navbar";
import Button from "@/components/Button";
import NumberInput from "@/components/NumberInput";
import ModalConfirm from "@/components/ModalConfirm";
import TagInput from "@/components/TagInput";
import { useState, useEffect, useRef } from "react";
import { useWeightRecordMethod } from "@/contexts/WeightRecordContext";
import { useRecordSync } from "@/contexts/RecordSyncContext";
import * as SecureStore from 'expo-secure-store';
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import SegmentedControl from "@/components/SegmentedControl";
import { MAX_WEIGHT_SCAN_AGE, MAX_WEIGHT_SCAN_KG, MAX_WEIGHT_SCAN_LB } from "@/constants/constants";
import CowHeadshotIcon from "@/assets/icons/CowHeadshotIcon";


const CalfWeightRecord = () => {

   const { tag } = useLocalSearchParams<{ tag?: string }>();

   const { isOnline } = useRecordSync();

   const router = useRouter();
   const { baseStyle, colors } = useTheme();

   const { checkDuplicateTag, commitRecord, recordCount,
      handleFinished, recallRecord, getStats } = useWeightRecordMethod();

   const [recordData, setRecordData] = useState<{
      id: number;
      tag: string;
      weight: number;
      sex: 'male' | 'female';
      age_in_days: number;
      animal: string;
      weight_unit: 'lb' | 'kg';
      time_unit: 'days' | 'weeks' | 'months';
      note?: string;
   }>({
      id: 0,
      tag: '',
      weight: 0,
      sex: 'female',
      age_in_days: 0,
      animal: '',
      weight_unit: 'lb',
      time_unit: 'days',
      note: '',
   });

   const [showMessage, setShowMessage] = useState(false);
   const [tagIsDuplicate, setTagIsDuplicate] = useState(false);
   const [tagSupplied, setTagSupplied] = useState(false);
   const [formValid, setFormValid] = useState(false);
   const [timeUnitOpen, setTimeUnitOpen] = useState(false);
   const [sexDropdownOpen, setSexDropdownOpen] = useState(false);
   const [showModal, setShowModal] = useState(false);
   const [editing, setEditing] = useState(false);

   // Animations for success feedback
   const fadeAnim = useRef(new Animated.Value(0)).current;
   const screenDarkAnim = useRef(new Animated.Value(0)).current;

   // If a tag is passed in as a URL param, use it to set RecordData
   // for editing an existing record
   useEffect(() => {
      if (tag) {
         const fetchedRecord = recallRecord(tag);

         setRecordData(prevData => ({
            id: fetchedRecord.id || 0,
            tag: fetchedRecord.tag || '',
            weight: fetchedRecord.weight || 0,
            sex: fetchedRecord.sex as 'male' | 'female',
            age_in_days: fetchedRecord.age_in_days || 0,
            animal: fetchedRecord.animal || 'C',
            weight_unit: fetchedRecord.weight_unit as 'lb' | 'kg',
            time_unit: fetchedRecord.time_unit as 'days' | 'weeks' | 'months',
            note: fetchedRecord.note || '',
         }));
         setTagSupplied(true);
         setEditing(true);
      } else {
         setTagSupplied(false);
         setEditing(false);
      }
   }, [tag]);


   // Load the weight unit from localStorage if present
   useEffect(() => {
      const getWeightUnit = async () => {
         const lsWeightUnit = await SecureStore.getItemAsync(
            'weight_form_weight_unit'
         );
         if (lsWeightUnit) {
            let unit = JSON.parse(lsWeightUnit) as 'lb' | 'kg';
            setRecordData(prevData => ({
               ...prevData,
               weight_unit: unit,
            }));
         }
      }
      getWeightUnit();
   }, []);

   // Load the time unit from localStorage if present
   useEffect(() => {
      const getTimeUnit = async () => {
         const lsTimeUnit = await SecureStore.getItemAsync('weight_time_unit')
         if (lsTimeUnit) {
            setRecordData(prevData => ({
               ...prevData,
               time_unit: JSON.parse(lsTimeUnit),
            }));
         }
      }
      getTimeUnit();
   }, []);

   // Close virtual keyboard when user opens the sex or timeunit dropdowns
   useEffect(() => {
      Keyboard.dismiss();
   }, [sexDropdownOpen, timeUnitOpen]);

   // Check the validity of the form
   useEffect(() => {
      const tagValid = tagSupplied && !tagIsDuplicate;
      const sexValid = recordData.sex === 'male' || recordData.sex == 'female';


      const timeUnit = recordData.time_unit;
      const maxAge = MAX_WEIGHT_SCAN_AGE;
      let adjustedMaxAge = maxAge;
      if (timeUnit === 'weeks' && maxAge) {
         adjustedMaxAge = Math.floor(maxAge / 7);
      } else if (timeUnit === 'months' && maxAge) {
         adjustedMaxAge = Math.floor(maxAge / 30);
      }
      const ageValid = recordData.age_in_days > 0 && recordData.age_in_days <= adjustedMaxAge;


      let weightValid = true;
      if (recordData.weight_unit === 'kg') {
         weightValid = recordData.weight > 0 && recordData.weight <= MAX_WEIGHT_SCAN_KG;
      } else if (recordData.weight_unit === 'lb') {
         weightValid = recordData.weight > 0 && recordData.weight <= MAX_WEIGHT_SCAN_LB;
      }

      if (tagValid && weightValid && sexValid && ageValid) {
         setFormValid(true);
      } else {
         setFormValid(false);
      }
   }, [tagIsDuplicate, tagSupplied, recordData]);

   // Save the weight unit to localStorage when it changes
   useEffect(() => {
      const updateSecureStore = async () => {
         await SecureStore.setItemAsync(
            'weight_time_unit',
            JSON.stringify(recordData.time_unit));
      }
      updateSecureStore();
   }, [recordData.time_unit]);

   // Tag input handler
   const handleTagChange = (value: string) => {
      if (value && value.length > 0) {
         const isDuplicate = checkDuplicateTag(value);
         setTagIsDuplicate(isDuplicate);
         setTagSupplied(true);
      } else {
         setTagSupplied(false);
         setTagIsDuplicate(false);
      }
      setRecordData(prevData => ({
         ...prevData,
         tag: value || '',
      }));
   }

   // Age input handler
   const handleAgeChange = (value: string) => {
      const age = parseInt(value) || 0;
      setRecordData(prevData => ({
         ...prevData,
         age_in_days: age
      }));

   }

   // Allow the user to edit any record entered in this session
   const handlePreviousClicked = () => {
      router.replace('/weight_tag_list');
   }

   // Commit the record to localStorage and reset the form
   const handleNextClicked = () => {

      // Calculate age adjusted for selected time unit
      let adjustedTime = recordData.age_in_days;
      const timeUnit = recordData.time_unit;
      if (timeUnit === 'months') {
         adjustedTime *= 30;
      } else if (timeUnit === 'weeks') {
         adjustedTime *= 7;
      }
      const adjustedRecord = {
         ...recordData,
         age_in_days: adjustedTime,
      }
      commitRecord(adjustedRecord);
      setRecordData({
         id: 0,
         tag: '',
         weight: 0,
         sex: 'female',
         age_in_days: 0,
         animal: '',
         weight_unit: adjustedRecord.weight_unit,
         time_unit: adjustedRecord.time_unit,
      });

      if (editing) {
         setEditing(false);
         router.replace('/calf_weight_record'); // reload without param 
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
   }

   // Handle the user clicking the finish button to end the session
   // and navigate to the summary screen
   const handleFinishClicked = () => {

      const currentWeightUnit = recordData.weight_unit;
      handleFinished();
      setRecordData({
         ...recordData,
         id: 0,
         tag: '',
         weight: 0,
         age_in_days: 0,
         sex: 'female',
         animal: '',
         weight_unit: currentWeightUnit,
      });

      // Navigate to summary screen
      if (recordCount > 0) {
         router.replace('/weight_summary');
      } else {
         router.replace('/');
      }
   }

   const onShowConfirmFinishModal = () => {
      setShowModal(true);
   }

   // ******* VALIDATION *******

   const overWeight = recordData.weight_unit === 'kg' ?
      recordData.weight > MAX_WEIGHT_SCAN_KG : recordData.weight > MAX_WEIGHT_SCAN_LB;
   const overWeightMessage = recordData.weight_unit === 'kg' ?
      `Max ${MAX_WEIGHT_SCAN_KG}kg` :
      `Max ${MAX_WEIGHT_SCAN_LB}lb`;

   const timeUnit = recordData.time_unit;
   const maxAge = MAX_WEIGHT_SCAN_AGE;
   let adjustedMaxAge = maxAge;
   if (timeUnit === 'weeks' && maxAge) {
      adjustedMaxAge = Math.floor(maxAge / 7);
   } else if (timeUnit === 'months' && maxAge) {
      adjustedMaxAge = Math.floor(maxAge / 30);
   }

   return (

      <View style={{
         flex: 1,
         justifyContent: "flex-start",
         alignItems: "center",
         backgroundColor: colors.bgColor,
         position: "relative",
      }}>
         <Navbar title="Young Stock" subTitle="Weight Recorder" />

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

         {/* Editing record banner */}
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

         {/* Main content area */}
         <View style={{ flex: 1, width: "100%" }}>
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

                     <TagInput
                        tag={recordData.tag}
                        tagSupplied={tagSupplied}
                        tagIsDuplicate={tagIsDuplicate}
                        handleTagChange={handleTagChange}
                     />

                     {/* Sex Selection Section */}
                     <View
                        style={{
                           width: "100%",
                           flexDirection: "row",
                           alignItems: "center",
                           justifyContent: "center",  // Changed to flex-start for proper alignment
                           marginTop: 30,
                        }}>
                        <View style={{
                           width: "55%",
                           justifyContent: "center",
                        }}>
                           <SegmentedControl
                              options={['Female', 'Male']}
                              selectedOption={recordData.sex === 'female' ? 'Female' : 'Male'}
                              onSelect={(value) => {
                                 const sex = value === 'Female' ? 'female' : 'male';
                                 setRecordData(prevData => ({
                                    ...prevData,
                                    sex: sex as 'female' | 'male'
                                 }));
                              }}
                              fgColor={colors.brgtColor}
                              bgColor={colors.bgColor}
                              containerStyle={{
                                 alignSelf: "center",
                              }}
                              buttonStyleSelected={{
                                 fontSize: 20,
                                 paddingHorizontal: 12,
                              }}
                              buttonStyleUnselected={{
                                 fontSize: 20,
                                 paddingHorizontal: 12,
                              }}
                           />
                        </View>
                     </View>


                     {/* Weight Input Section */}
                     <View
                        style={{
                           width: "100%",
                           flexDirection: "row",
                           justifyContent: "center",
                           marginTop: 30,
                        }}>

                        <View style={{
                           width: "40%",  // Adjusted width
                           marginRight: 10,
                           justifyContent: "center",
                        }}>
                           <SegmentedControl
                              options={['lb', 'kg']}
                              selectedOption={recordData.weight_unit}
                              onSelect={(value) => {
                                 setRecordData(prevData => ({
                                    ...prevData,
                                    weight_unit: value as 'lb' | 'kg',
                                    weight: 0,
                                 }));
                              }}
                              fgColor={colors.brgtColor}
                              bgColor={colors.bgColor}
                              containerStyle={{
                                 alignSelf: "flex-end",
                              }}
                              buttonStyleSelected={{
                                 fontSize: 20,
                                 paddingHorizontal: 10,
                                 paddingVertical: 7
                              }}
                              buttonStyleUnselected={{
                                 fontSize: 20,
                                 paddingHorizontal: 10,
                              }}
                           />
                        </View>
                        <View style={{
                           width: "50%",  // Adjusted width
                           justifyContent: "flex-start",
                           flexDirection: "column",
                           alignItems: "flex-start",
                        }}>
                           <View style={{
                              width: "100%",
                              flexDirection: "row",
                              alignItems: "center",
                              position: "relative",
                           }}>
                              <NumberInput
                                 value={recordData.weight}
                                 onChange={(value) => {
                                    let weight = parseInt(value) || 0;
                                    setRecordData(prevData => ({
                                       ...prevData,
                                       weight: weight,
                                    }));
                                 }}
                                 style={{
                                    width: "100%",
                                    paddingRight: 80,
                                    borderColor: overWeight ? colors.error :
                                       recordData.weight <= 0 ? colors.warnColor :
                                          colors.brgtColor
                                 }}
                                 placeholder="Weight"
                                 placeholderTextColor={colors.warnColor}
                                 hideZero={true}
                              />

                              {/* Validation message inside the input */}
                              <Text style={{
                                 position: 'absolute',
                                 right: 10,
                                 fontSize: 14,
                                 fontWeight: 'bold',
                                 color: overWeight ? colors.error :
                                    recordData.weight <= 0 ? colors.warnColor :
                                       colors.brgtColor,
                              }}>
                                 {recordData.weight <= 0 ? "" :
                                    overWeight ? "Too high!" : "Valid"}
                              </Text>
                           </View>
                        </View>
                     </View>



                     {/* Age Input Section */}
                     <View
                        style={{
                           width: "100%",
                           flexDirection: "row",
                           alignItems: "flex-start",
                           justifyContent: "center",
                           marginTop: 15, // Reduced from 30
                        }}>

                        <View style={{
                           width: "40%",
                           marginRight: 10,
                           justifyContent: "center",
                        }}>

                           <SegmentedControl
                              options={['Dy', 'Wk', 'Mn']}
                              selectedOption={
                                 recordData.time_unit === 'days' ?
                                    'Dy' : recordData.time_unit === 'weeks' ?
                                       'Wk' : 'Mn'}
                              onSelect={(value) => {
                                 const timeUnit = value === 'Dy' ?
                                    'days' : value === 'Wk' ?
                                       'weeks' : 'months';
                                 setRecordData(prevData => ({
                                    ...prevData,
                                    time_unit: timeUnit as 'days' | 'weeks' | 'months',
                                    age_in_days: 0,
                                 }));
                              }}
                              fgColor={colors.brgtColor}
                              bgColor={colors.bgColor}
                              containerStyle={{
                                 alignSelf: "flex-end",
                              }}
                              buttonStyleSelected={{
                                 fontSize: 20,
                                 paddingHorizontal: 7,
                                 paddingVertical: 8
                              }}
                              buttonStyleUnselected={{
                                 fontSize: 20,
                                 paddingHorizontal: 7,
                                 paddingVertical: 8
                              }}
                           />
                        </View>

                        <View style={{
                           width: "50%",
                           justifyContent: "flex-start",
                        }}>
                           <View style={{
                              width: "100%",
                              position: "relative",
                              flexDirection: "row",
                              alignItems: "center",
                           }}>
                              <NumberInput
                                 value={recordData.age_in_days}
                                 onChange={handleAgeChange}
                                 style={{
                                    width: "100%",
                                    paddingRight: 80,
                                    borderColor: recordData.age_in_days > adjustedMaxAge ? colors.error :
                                       recordData.age_in_days <= 0 ? colors.warnColor :
                                          colors.brgtColor
                                 }}
                                 hideZero={true}
                                 placeholder="Age"
                                 placeholderTextColor={colors.warnColor}
                              />

                              {/* Validation message inside the input */}
                              <Text style={{
                                 position: 'absolute',
                                 right: 10,
                                 fontSize: 14,
                                 fontWeight: 'bold',
                                 color: recordData.age_in_days > adjustedMaxAge ? colors.error :
                                    recordData.age_in_days <= 0 ? colors.warnColor :
                                       colors.brgtColor,
                              }}>
                                 {recordData.age_in_days <= 0 ? "" :
                                    recordData.age_in_days > adjustedMaxAge ? "Too high!" : "Valid"}
                              </Text>
                           </View>
                        </View>
                     </View>





                     {/* Note Text Field */}
                     <View
                        style={{
                           width: "100%",
                           flexDirection: "row",
                           alignItems: "center",
                           justifyContent: "center",
                           marginTop: 30
                        }}>
                        <View style={{ width: "20%" }}>
                           <Text style={[baseStyle.label, {
                              textAlign: "right",
                              fontSize: 18,
                              fontWeight: "bold",
                           }]}
                           >Note</Text>
                        </View>

                        <View style={{
                           width: "70%",
                           marginLeft: 10,
                           justifyContent: "flex-start",
                        }}>
                           <TextInput
                              style={{
                                 width: "100%",
                                 padding: 10,
                                 borderWidth: 1,
                                 borderColor: colors.thrdColor,
                                 borderRadius: 10,
                                 color: colors.fgColor,
                                 backgroundColor: colors.bgLightColor,
                                 minHeight: 40,
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
                              testID="weight-note-input"
                           />
                        </View>
                     </View>

                     {/* Next Animal button */}
                     <View style={{
                        flex: 1,
                        flexDirection: "row",
                        justifyContent: "center",
                        alignItems: 'center',
                        width: "100%",
                        marginTop: 20, // Reduced from 30
                     }}>
                        <Button
                           onPress={handleNextClicked}
                           title="Next Animal"
                           style={{ width: "50%" }}
                           disabled={!formValid}
                        ></Button>
                     </View>
                     <View style={{
                        flex: 1,
                        justifyContent: "center",
                        alignItems: 'center',
                        width: "100%"
                     }}>

                     </View>

                     <ModalConfirm
                        title="Are you sure?"
                        message="This will end this recording session and email your data to you."
                        onConfirm={handleFinishClicked}
                        onCancel={() => setShowModal(false)}
                        modalVisible={showModal}
                     />


                     {/* Stats bar and Finish button */}
                     <View style={{
                        position: 'absolute',
                        bottom: 0,
                        width: '100%',
                        zIndex: 5, // Ensure it's above other content
                        backgroundColor: colors.thrdColor,
                        flexDirection: "row",
                        justifyContent: "space-around",
                        alignItems: 'center',
                        borderTopWidth: 1,
                        borderTopColor: colors.fgColor,
                     }}>
                        <View style={{
                           flexDirection: "row",
                           alignItems: 'center',
                           justifyContent: "center",
                        }}>

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
                                 paddingRight: 40,
                              }}
                              testID="pregnancy-stats-total"
                           >
                              {getStats().total}
                           </Text>
                        </View>

                        <Button
                           onPress={onShowConfirmFinishModal}
                           title="End Session"
                           style={{ marginVertical: 10, width: "50%" }} // Reduced from 20
                           disabled={formValid} />
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

      </View >

   );
}

export default CalfWeightRecord;