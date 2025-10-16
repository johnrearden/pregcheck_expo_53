import { createContext, useContext, useEffect, useState } from "react";
import { useSQLiteContext } from "expo-sqlite";
import {
    addLocalRecord, bulkUpdateRecords, createLocalSession,
    updateLocalRecord, updateLocalSession,
    getRecordsForSession,
    removeEmptySession
} from "@/utilities/DatabaseUtils";
import { useStats } from "./StatsContext";
import { AnimalType, TimeUnit } from "@/constants/Types";
import { api } from "@/services/ApiService";
import { useToast } from '../hooks/useToast';
import { AsyncStorageSession } from "@/constants/Interfaces";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { PREG_SESSION_KEY } from "@/constants/asyncStorageKeys";


export const initialRecord = {
    server_pk: 0,
    device_pk: 0,
    device_session_pk: 0,
    owner: 0,
    animal: 'C' as AnimalType,
    gestation_days: 0,
    tag: '',
    due_date: '',
    days_pregnant: 0,
    time_unit: TimeUnit.Days,
    calf_count: 0,
    pregnancy_status: false,
    note: "",
}

export interface RecordType {
    server_pk?: number;
    device_pk?: number;
    device_session_pk?: number;
    owner?: number;
    animal?: AnimalType | ''; // Using union type to allow empty string as initial value
    gestation_days?: number;
    tag: string;
    due_date: string;
    days_pregnant?: number;
    time_unit?: TimeUnit;
    calf_count?: number;
    pregnancy_status?: boolean;
    note?: string;
    date?: string;
    created_at?: string;
}

export interface PersistRecordContextType {
    persistRecord: (record: RecordType) => void;
    commitRecord: (record: RecordType) => void;
    recallRecord: (tag: string) => RecordType;
    createSession: (gestation_days: number) => void;
    handleFinished: () => void;
    getStats: () => any;
    checkDuplicateTag: (tag: string) => boolean;
    resetState: () => void;
    getTagList: () => string[];
    isSessionRunning?: boolean;
    isFinishing?: boolean;
    recordCount: number;
}

export const RecordContext = createContext<RecordType>({
    server_pk: 0,
    device_pk: 0,
    device_session_pk: 0,
    owner: 0,
    animal: AnimalType.Cow,
    gestation_days: 0,
    days_pregnant: 0,
    time_unit: TimeUnit.Days,
    tag: '',
    due_date: '',
    calf_count: 0,
    pregnancy_status: false,
    note: "",
});

export const PersistRecordContext = createContext<PersistRecordContextType>({
    persistRecord: () => { },
    commitRecord: () => { },
    recallRecord: () => initialRecord,
    createSession: (gestation_days: number) => { },
    handleFinished: () => { },
    getStats: () => ({
        total: 0,
        pregnant: 0,
        empty: 0,
        single: 0,
        twins: 0,
        triplets: 0,
        quads: 0,
        quins: 0,
    }),
    checkDuplicateTag: () => false,
    resetState: () => { },
    getTagList: () => [],
    isSessionRunning: false,
    isFinishing: false,
    recordCount: 0,
});

export const useRecord = () => useContext(RecordContext);
export const usePersistRecord = () => useContext(PersistRecordContext);

export const RecordProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    // Use StatsContext and ErrorContext
    const { stats, calculateStats, resetStats } = useStats();
    const showToast = useToast();

    const db = useSQLiteContext();

    // Set the initial default state of the record
    const [record, setRecord] = useState<RecordType>(initialRecord);

    // Set the initial default state of the sessionID
    const [sessionID, setSessionID] = useState<number>(0);

    // Set the initial state of the sessionRunning flag, used throughout
    // the app to determine if a session is running
    const [sessionRunning, setSessionRunning] = useState<boolean>(false);

    // Set the finishing flag to prevent database access during cleanup
    const [isFinishing, setIsFinishing] = useState<boolean>(false);

    // Set the initial default state of the recordList
    const [recordList, setRecordList] = useState<RecordType[]>([]);

    useEffect(() => {
        // Load the session from AsyncStorage when the component mounts
        const loadSession = async () => {
            try {
                const sessionData = await AsyncStorage.getItem(PREG_SESSION_KEY);
                if (sessionData) {
                    const session: AsyncStorageSession = JSON.parse(sessionData);
                    console.log('Retrieved session from AsyncStorage:', session);
                    const session_id = session.device_session_pk;
                    setSessionID(session_id);
                    setSessionRunning(true);
                    if (session.animal) {
                        setRecord(prev => ({
                            ...prev,
                            animal: session.animal || '',
                            gestation_days: session.gestation_days,
                        }));
                    }
                    // Load the records associated with the session
                    const records = await getRecordsForSession(db, session_id);
                    if (records) {
                        setRecordList(records);
                        calculateStats(records);
                    }
                }
            } catch (error) {
                console.error("Error loading session from AsyncStorage:", error);
            }
        };

        loadSession();


    }, []);

    // Save each incremental change to the record in local state
    const persistRecord = (partial: RecordType) => {
        let newRecord = { ...record, ...partial };
        setRecord(newRecord);
    }

    // Save the final record to the database and update the local state
    const commitRecord = async (partial: RecordType) => {
        try {
            let newRecord = { ...record, ...partial };
            newRecord.device_session_pk = sessionID;
            if (newRecord.pregnancy_status) {
                const offsetDays = (newRecord.gestation_days ?? 0) - (newRecord.days_pregnant ?? 0);
                const dueDate = new Date(Date.now() + offsetDays * 24 * 60 * 60 * 1000);
                newRecord.due_date = dueDate.toISOString().split('T')[0];
            }

            // Check if the record already has a device_pk
            const recordExists = newRecord.device_pk !== 0;

            if (recordExists) {
                // Update the existing record in the database
                await updateLocalRecord(db, newRecord);
            } else {
                // Add the record to the database
                const pk = await addLocalRecord(db, newRecord);
                newRecord = {
                    ...newRecord,
                    device_pk: pk,
                };
            }

            if (recordExists) {
                // const response = await api.put(
                //     'exam_session/edit_record/',
                //     newRecord
                // );

                // To simplify the process, don't send any post/put requests to 
                // the server until the end of the session
                // Uncomment the following code to enable server communication

                // if (response.success && response.data) {
                //     const data = response.data as { id: number; owner: number };
                //     newRecord = {
                //         ...newRecord,
                //         server_pk: data.id,
                //         owner: data.owner
                //     };
                // } else if (response.error) {
                //     // Handle offline mode or other errors
                //     if (response.offline) {
                //         showToast('You are offline. Changes saved locally.', 'warning');
                //     } else {
                //         console.error("Failed to update record on server:", response.error);
                //         showToast('Error updating record on server. Changes saved locally.', 'error');
                //     }
                // }

                // Update the record in local state
                const updatedRecordList = recordList.map((record) => {
                    if (record.device_pk === newRecord.device_pk) {
                        return newRecord;
                    } else {
                        return record;
                    }
                });
                setRecordList(updatedRecordList);

                // Update stats based on the new record list
                calculateStats(updatedRecordList);
            } else {
                // To simplify the process, don't send any post/put requests to 
                // the server until the end of the session
                // Uncomment the following code to enable server communication


                // Attempt posting the record to the database
                // const response = await api.post(
                //     'exam_session/create_record/',
                //     newRecord
                // );

                // if (response.success && response.data) {
                //     // Explicitly type response.data to include id and owner properties
                //     const data = response.data as { id: number; owner: number };

                //     // If the post is successful, add the server_pk and owner to the record
                //     newRecord = {
                //         ...newRecord,
                //         server_pk: data.id,
                //         owner: data.owner
                //     };

                //     // Update the local record in the database with the server_pk and owner
                //     await updateLocalRecord(db, newRecord);
                // } else if (response.error) {
                //     // Handle offline mode or other errors
                //     if (response.offline) {
                //         console.error('You are offline. Record saved locally.', 'warning');
                //     } else {
                //         console.error("Failed to create record on server:", response.error);
                //         showToast('Error creating record on server. Record saved locally.', 'error');
                //     }
                //     newRecord.server_pk = 0;
                //     newRecord.owner = 0;
                // }

                // Add the new record to the recordList and update stats
                const newRecordList = [...recordList, newRecord];
                setRecordList(newRecordList);
                calculateStats(newRecordList);
            }

            // Clear the record in local state, keeping the gestation_days and animal fields
            setRecord({
                ...record,
                tag: '',
                days_pregnant: 0,
                calf_count: 0,
                pregnancy_status: false,
                note: "",
                device_pk: 0,
                server_pk: 0,
            });

            return true;
        } catch (error) {
            console.error("Error in commitRecord:", error);
            showToast('An unexpected error occurred. Record saved locally.', 'error');
            return false;
        }
    };

    // Create a new session
    // NOTE : This function is called by just one client, the gestation_days.tsx
    // screen. It is called when the user clicks on the "Next" button. The gestation_days
    // param must be passed, as the state of the record is set until the next
    // rerender. Thanks React!
    const createSession = async (gestation_days: number) => {
        // Reset stats and recordList from previous session before creating new one
        console.log('[RecordContext] Creating new session, resetting previous session data');
        setRecordList([]);
        resetStats();

        const newSessionID = await createLocalSession(db);

        if (newSessionID) {
            const asyncStorageSession: AsyncStorageSession = {
                device_session_pk: newSessionID,
                session_type: 'pregnancy',
                animal: record.animal === '' ? null : record.animal,
                gestation_days: gestation_days || 0,
            };
            await AsyncStorage.setItem(
                PREG_SESSION_KEY,
                JSON.stringify(asyncStorageSession));
            setSessionID(newSessionID);
            setSessionRunning(true);
            setRecord(prev => ({
                ...prev,
                device_session_pk: newSessionID,
            }));
        }
    }

    // Handle finishing a session, sending data to the server
    const handleFinished = async () => {
        console.log('[RecordContext] handleFinished started, sessionID:', sessionID, 'recordCount:', recordList.length);

        // Set finishing flag to prevent concurrent database access
        setIsFinishing(true);

        try {
            // Check if this session contains any records
            if (recordList.length === 0) {
                console.log('[RecordContext] Empty session, removing from database');
                await removeEmptySession(db, sessionID);
                return;
            }

            console.log('[RecordContext] Preparing to sync session with', recordList.length, 'records');

            let unpostedRecords = recordList.filter((record) => record.server_pk === 0);
            let postedRecords = recordList.filter((record) => record.server_pk !== 0);
            let postedRecordIds = postedRecords.map((record) => record.server_pk);

            console.log('[RecordContext] Unposted:', unpostedRecords.length, 'Posted:', postedRecords.length);

            let postData = {
                unposted_records: unpostedRecords,
                posted_record_ids: postedRecordIds,
                device_session_pk: sessionID,
            };

            // Send the unposted records to the database and request an email summary
            console.log('[RecordContext] Sending session to server...');
            const response = await api.post(
                'exam_session/create_session/',
                postData
            );
            console.log('[RecordContext] Server response received, success:', response.success);

            if (response.success && response.data) {
                type ServerResponse = {
                    session: {
                        id: number;
                    },
                    unposted_record_ids: Record<string, number>,
                    owner: number,
                }
                const data = response.data as ServerResponse;
                const server_session_pk = data.session.id;
                const unpostedRecordIds = data.unposted_record_ids;
                const owner = data.owner;

                console.log('[RecordContext] Server session created, ID:', server_session_pk);

                // Request an email summary of the session IMMEDIATELY (non-critical, independent of DB operations)
                // This runs BEFORE database operations to ensure DB errors don't prevent email sending
                try {
                    console.log('[RecordContext] ======================================');
                    console.log('[RecordContext] ENTERING send_pdf_summary block');
                    console.log('[RecordContext] Timestamp:', new Date().toISOString());
                    console.log('[RecordContext] Session ID:', server_session_pk);
                    console.log('[RecordContext] About to call api.post for send_pdf_summary...');

                    const startTime = Date.now();
                    const summaryResponse = await api.post(
                        'exam_session/send_pdf_summary/',
                        { session_id: server_session_pk }
                    );
                    const endTime = Date.now();

                    console.log('[RecordContext] API call completed in', endTime - startTime, 'ms');
                    console.log('[RecordContext] Full response object:', JSON.stringify(summaryResponse, null, 2));
                    console.log('[RecordContext] Response.success:', summaryResponse.success);
                    console.log('[RecordContext] Response.offline:', summaryResponse.offline);
                    console.log('[RecordContext] Response.error:', summaryResponse.error);
                    console.log('[RecordContext] Response.data:', summaryResponse.data);

                    if (!summaryResponse.success) {
                        console.log('[RecordContext] Response was NOT successful');
                        if (summaryResponse.offline) {
                            console.log('[RecordContext] Reason: Offline');
                            showToast('You are offline. Summary email will be sent when connectivity is restored.', 'warning');
                        } else if (summaryResponse.error) {
                            console.error("[RecordContext] Reason: Error -", summaryResponse.error);
                            showToast('Error sending summary email.', 'error');
                        } else {
                            console.log('[RecordContext] Reason: Unknown (success=false, but no offline/error flag)');
                        }
                    } else {
                        console.log('[RecordContext] ✅ Email summary requested successfully');
                    }
                    console.log('[RecordContext] EXITING send_pdf_summary block');
                    console.log('[RecordContext] ======================================');
                } catch (emailError) {
                    // Non-critical error - don't let it break the session finish
                    console.error("[RecordContext] ❌ EXCEPTION CAUGHT in send_pdf_summary block");
                    console.error("[RecordContext] Exception details:", emailError);
                    console.error("[RecordContext] Exception type:", typeof emailError);
                    console.error("[RecordContext] Exception stringified:", JSON.stringify(emailError, null, 2));
                    console.error("[RecordContext] ======================================");
                }

                // Loop through the unposted records and update their server pk
                const newList = [];
                for (const record of recordList) {
                    const key = `${record.device_pk}`;
                    const server_pk = unpostedRecordIds[key];
                    if (server_pk) {
                        record.server_pk = server_pk;
                        record.owner = owner;
                    }
                    record.device_session_pk = server_session_pk;
                    newList.push(record);
                }

                console.log('[RecordContext] Updating local database with server IDs...');
                await bulkUpdateRecords(db, newList, server_session_pk);
                await updateLocalSession(db, server_session_pk, sessionID, recordList.length);
                console.log('[RecordContext] Local database updated successfully');
            } else if (response.offline) {
                console.log('[RecordContext] Offline - session will sync later');
                showToast('You are offline. Session will be synchronized when connectivity is restored.', 'warning');
            } else if (response.error) {
                console.error("[RecordContext] Failed to create session:", response.error);
                showToast('Error creating session. Data saved locally.', 'error');
            }

            console.log('[RecordContext] handleFinished completed successfully');
            return true;

        } catch (error) {
            console.error("[RecordContext] CRITICAL ERROR in handleFinished:", error);
            showToast('Error completing session. Data saved locally.', 'error');
            return false;
        } finally {
            // ✅ CRITICAL: Always execute cleanup, even if errors occur above
            console.log('[RecordContext] Cleaning up session state (finally block)');

            // Clear AsyncStorage
            try {
                await AsyncStorage.removeItem(PREG_SESSION_KEY);
                console.log('[RecordContext] AsyncStorage cleared');
            } catch (error) {
                console.error("[RecordContext] Error removing session from AsyncStorage:", error);
            }

            // CRITICAL: Always set session to not running
            setSessionRunning(false);
            console.log('[RecordContext] Session marked as not running');

            // NOTE: Do NOT reset stats and recordList here!
            // The summary screen needs these stats to display the pie chart.
            // They will be reset when a new session starts (in createSession)
            console.log('[RecordContext] Keeping stats and recordList for summary screen display');

            // Clear finishing flag
            setIsFinishing(false);
            console.log('[RecordContext] Finishing flag cleared');
        }
    }

    // Check if a tag already exists in the record list
    const checkDuplicateTag = (tag: string) => {
        return recordList.some((record) => record.tag === tag);
    }

    // Get all tags in reverse order
    const getTagList = () => {
        const list = recordList.map((record) => record.tag);
        return list.reverse();
    }

    // Find a record by tag and set it as the current record
    const recallRecord = (tag: string): RecordType => {
        const record = recordList.find((record) => record.tag === tag);
        if (record) {
            setRecord(record);
            return record;
        } else {
            return initialRecord;
        }
    }

    // Reset all state
    const resetState = () => {
        setRecord(initialRecord);
        setRecordList([]);
        resetStats();
    }
    

    return (
        <RecordContext.Provider value={record}>
            <PersistRecordContext.Provider
                value={{
                    persistRecord,
                    commitRecord,
                    recallRecord,
                    createSession,
                    handleFinished,
                    getStats: () => stats,
                    checkDuplicateTag,
                    resetState,
                    getTagList,
                    isSessionRunning: sessionRunning,
                    isFinishing: isFinishing,
                    recordCount: recordList.length,
                }}>
                {children}
            </PersistRecordContext.Provider>
        </RecordContext.Provider>
    );
};