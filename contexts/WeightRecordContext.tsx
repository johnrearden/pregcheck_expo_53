import { createContext, useContext, useEffect, useState } from "react";
import {
    addLocalWeightRecord, bulkUpdateWeightRecords, createLocalWeightSession,
    getRecordsForWeightSession,
    removeEmptyWeightSession,
    updateLocalWeightRecord, updateLocalWeightSession
} from "@/utilities/DatabaseUtils";
import { useSQLiteContext } from "expo-sqlite";
import { api } from "@/services/ApiService";
import { useToast } from '../hooks/useToast';
import AsyncStorage from "@react-native-async-storage/async-storage";
import { WEIGHT_SESSION_KEY } from "@/constants/asyncStorageKeys";


interface AgeWeight {
    age: number;
    weight: number;
    weight_unit: string;
    sex: string;
}

export const initialRecord = {
    id: 0,
    owner: 0,
    tag: '',
    due_date: '',
    weight: 0,
    sex: '',
    age_in_days: 0,
    animal: '',
    weight_unit: '',
    time_unit: '',
    note: '',
    server_pk: 0,
    device_session_pk: 0,
    device_pk: 0,
}

export interface WeightRecordType {
    id?: number; // server primary key
    owner?: number;
    tag: string;
    date?: string; // date of the record
    weight: number;
    sex: string;
    weight_unit: string;
    age_in_days: number;
    animal: string;
    time_unit?: string;
    note?: string;
    server_pk?: number;
    device_session_pk?: number;
    device_pk?: number; // local sqlite primary key
}

export interface StatsType {
    total: number;
    total_male: number;
    total_female: number;
    total_weight: number;
    weight_unit: string;
    ageWeights: AgeWeight[];
    kilo_unit_count: number;
}

export interface WeightRecordMethodContextType {
    commitRecord: (record: WeightRecordType) => void;
    handleFinished: () => void;
    getStats: () => StatsType;
    checkDuplicateTag: (tag: string) => boolean;
    resetWeightState: () => void;
    createWeightSession: () => void;
    getTagList: () => string[];
    recallRecord: (tag: string) => WeightRecordType;
    isWeightSessionRunning?: boolean;
    isWeightFinishing?: boolean;
    recordCount: number;
}

export const WeightRecordContext = createContext<WeightRecordType>({
    id: 0,
    owner: 0,
    tag: '',
    weight: 0,
    sex: '',
    age_in_days: 0,
    animal: '',
    weight_unit: '',
    time_unit: '',
    note: '',
    server_pk: 0,
    device_session_pk: 0,
    device_pk: 0,
});

export const WeightRecordMethodContext = createContext<WeightRecordMethodContextType>({
    commitRecord: () => { },
    handleFinished: () => { },
    getStats: () => {
        return {
            total: 0,
            total_male: 0,
            total_female: 0,
            total_weight: 0,
            weight_unit: '',
            ageWeights: [],
            kilo_unit_count: 0,
        }
    },
    checkDuplicateTag: () => false,
    resetWeightState: () => { },
    createWeightSession: () => { },
    getTagList: () => [],
    recallRecord: (tag: string) => initialRecord as WeightRecordType,
    isWeightSessionRunning: false,
    isWeightFinishing: false,
    recordCount: 0,
});

export const useWeightRecord = () => useContext(WeightRecordContext);
export const useWeightRecordMethod = () => useContext(WeightRecordMethodContext);

export const WeightRecordProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    console.log('[WeightRecordContext] WeightRecordProvider mounting');

    // Set the initial state of the weight record
    const [weightRecord, setWeightRecord] = useState<WeightRecordType>(initialRecord);

    // Set the initial default state of the sessionID
    const [sessionID, setSessionID] = useState<number>(0);

    // Set the initial state of the sessionRunning flag, used throughout
    // the app to determine if a session is running
    const [sessionRunning, setSessionRunning] = useState<boolean>(false);

    // Set the finishing flag to prevent database access during cleanup
    const [isFinishing, setIsFinishing] = useState<boolean>(false);

    // Get a reference to the SQLite database
    const db = useSQLiteContext();
    console.log('[WeightRecordContext] useSQLiteContext returned:', !!db);

    const showToast = useToast();

    // Set the initial state of the weight record list
    const [weightRecordList, setWeightRecordList] = useState<WeightRecordType[]>([]);

    // Set the initial state of the stats
    const [stats, setStats] = useState<StatsType>({
        total: 0,
        total_male: 0,
        total_female: 0,
        total_weight: 0,
        weight_unit: '',
        ageWeights: [],
        kilo_unit_count: 0,
    });

    // Check for the existence of a session in AsyncStorage on mount
    useEffect(() => {
        console.log('[WeightRecordContext] useEffect (loadSession) triggered');

        const loadSession = async () => {
            try {
                console.log('[WeightRecordContext] Checking AsyncStorage for existing session...');
                const sessionData = await AsyncStorage.getItem(WEIGHT_SESSION_KEY);
                if (sessionData) {
                    console.log('[WeightRecordContext] Found existing session in AsyncStorage');
                    const session = JSON.parse(sessionData);
                    setSessionID(session.device_session_pk);
                    setSessionRunning(true);
                    setWeightRecord(prev => ({
                        ...prev,
                        device_session_pk: session.device_session_pk,
                        animal: session.animal,
                    }));

                    // Load the weight records for this session
                    // CRITICAL: Only access database if it's available
                    if (db) {
                        console.log('[WeightRecordContext] Database available, loading records for session:', session.device_session_pk);
                        try {
                            const records = await getRecordsForWeightSession(
                                db,
                                session.device_session_pk
                            )
                            console.log('[WeightRecordContext] Successfully loaded', records?.length || 0, 'records');
                            if (records) {
                                setWeightRecordList(records);
                            }
                        } catch (error) {
                            console.error('[WeightRecordContext] FAILED to load records on mount:', error);
                            console.error('[WeightRecordContext] Error code:', (error as any)?.code);
                            console.error('[WeightRecordContext] Error message:', (error as any)?.message);
                        }
                    } else {
                        console.warn('[WeightRecordContext] Database not available yet, skipping record load');
                    }
                } else {
                    console.log('[WeightRecordContext] No existing session found in AsyncStorage');
                }
            } catch (error: any) {
                console.error('[WeightRecordContext] Error loading session from AsyncStorage:', error);
            }
        }
        loadSession();
    }, []);


    // Save the final record to the database and update local state
    const commitRecord = async (record: WeightRecordType) => {

        const fullRecord = { ...weightRecord, ...record };
        fullRecord.device_session_pk = sessionID;
        console.log('Committing record:', fullRecord);

        // Check if the record already has a device_pk
        // If it does, it means it already exists in the local database
        const recordExists = fullRecord.device_pk !== 0;

        if (recordExists) {
            // Update the existing record in the local database
            await updateLocalWeightRecord(db, fullRecord);
        } else {
            // Add this new record to the local database
            const pk = await addLocalWeightRecord(db, fullRecord);
            fullRecord.device_pk = pk;
        }

        if (recordExists) {
            // To simplify the process, don't send any post/put requests to 
            // the server until the end of the session
            // Uncomment the following code to enable server communication

            // Update the record on the server
            // const response = await api.put(
            //     'exam_session/edit_weight_record/',
            //     fullRecord
            // );

            // if (response.success && response.data) {
            //     const data = response.data as { id: number, owner: number };
            //     fullRecord.server_pk = data.id;
            //     fullRecord.owner = data.owner;
            // } else if (response.error) {
            //     // Handle offline mode or other errors
            //     if (response.offline) {
            //         console.error('You are offline. Record saved locally.', 'warning');
            //     } else {
            //         console.error("Failed to update record on server:", response.error);
            //         showToast('Error updating record on server. Record saved locally.', 'error');
            //     }
            // }

            // Replace the edited record in the weightRecordList
            const newRecordList = weightRecordList.map(rec => {
                if (rec.device_pk === fullRecord.device_pk) {
                    return fullRecord;
                }
                return rec;
            })
            setWeightRecordList(newRecordList);
        } else {
            // To simplify the process, don't send any post/put requests to 
            // the server until the end of the session
            // Uncomment the following code to enable server communication

            // Post the record to the server
            
            // const response = await api.post(
            //     'exam_session/create_weight_record/',
            //     fullRecord
            // );

            // if (response.success && response.data) {
            //     const data = response.data as { id: number, owner: number };
            //     fullRecord.server_pk = data.id;
            //     fullRecord.owner = data.owner;

            //     // Update the local record with the server pk
            //     await updateLocalWeightRecord(db, fullRecord);
            // } else if (response.error) {
            //     // Handle offline mode or other errors
            //     if (response.offline) {
            //         console.error('You are offline. Record saved locally.', 'warning');
            //     } else {
            //         console.error("Failed to create record on server:", response.error);
            //     }
            //     fullRecord.server_pk = 0;
            //     fullRecord.owner = 0;
            // }

            const newRecordList = [...weightRecordList, fullRecord];
            setWeightRecordList(newRecordList);
        }

        // Update the stats
        setStats({
            total: stats.total + 1,
            total_male: stats.total_male + (record.sex === 'male' ? 1 : 0),
            total_female: stats.total_female + (record.sex === 'female' ? 1 : 0),
            total_weight: stats.total_weight + record.weight,
            weight_unit: record.weight_unit,
            ageWeights: [...stats.ageWeights, {
                age: record.age_in_days,
                weight: record.weight,
                weight_unit: record.weight_unit,
                sex: record.sex,
            }],
            kilo_unit_count: stats.kilo_unit_count + (record.weight_unit === 'kg' ? 1 : 0),
        });

        // Reset the weight record to its initial state
        setWeightRecord(initialRecord);
    }

    const handleFinished = async () => {
        console.log('[WeightRecordContext] handleFinished started, sessionID:', sessionID, 'recordCount:', weightRecordList.length);

        // Set finishing flag to prevent concurrent database access
        setIsFinishing(true);

        try {
            // Check if this session contains any records
            if (weightRecordList.length === 0) {
                console.log('[WeightRecordContext] Empty session, removing from database');
                await removeEmptyWeightSession(db, sessionID);
                return;
            }

            console.log('[WeightRecordContext] Preparing to sync session with', weightRecordList.length, 'records');

            // Create a list of unposted records and a list of posted record ids
            let unpostedRecords = weightRecordList.filter((record) => record.server_pk === 0);
            let postedRecords = weightRecordList.filter((record) => record.server_pk !== 0);
            let postedRecordIds = postedRecords.map((record) => record.server_pk);

            console.log('[WeightRecordContext] Unposted:', unpostedRecords.length, 'Posted:', postedRecords.length);

            let postData = {
                unposted_records: unpostedRecords,
                posted_record_ids: postedRecordIds,
                device_session_pk: sessionID,
            };

            console.log('[WeightRecordContext] Sending session to server...');
            const response = await api.post(
                'exam_session/create_weight_session/',
                postData
            );
            console.log('[WeightRecordContext] Server response received, success:', response.success);

            if (response.success && response.data) {
                type ServerResponse = {
                    session: {
                        id: number;
                    },
                    unposted_record_ids: Record<string, number>,
                    owner: number;
                }
                const data = response.data as ServerResponse;
                const server_session_pk = data.session.id;
                const unposted_record_ids = data.unposted_record_ids;
                const owner = data.owner;

                console.log('[WeightRecordContext] Server session created, ID:', server_session_pk);

                // Loop through the unposted records and update their server pk
                const newList = [];
                for (const record of weightRecordList) {
                    const key = `${record.device_pk}`;
                    const server_pk = unposted_record_ids[key];
                    if (server_pk) {
                        record.server_pk = server_pk;
                        record.owner = owner;
                    }
                    record.device_session_pk = server_session_pk;
                    newList.push(record);
                }

                console.log('[WeightRecordContext] Updating local database with server IDs...');
                await bulkUpdateWeightRecords(db, newList, server_session_pk);
                await updateLocalWeightSession(db, server_session_pk, sessionID, weightRecordList.length);
                console.log('[WeightRecordContext] Local database updated successfully');

                // Request an email summary of the session (non-critical)
                try {
                    console.log('[WeightRecordContext] Requesting email summary...');
                    const emailResponse = await api.post(
                        'exam_session/send_weight_summary_email/',
                        { session_id: server_session_pk }
                    );
                    if (emailResponse.success) {
                        console.log('[WeightRecordContext] Email summary sent successfully');
                        showToast('Email summary sent successfully.', 'success');
                    }
                    else if (emailResponse.error) {
                        console.error("[WeightRecordContext] Failed to send email summary:", emailResponse.error);
                        showToast('Error sending email summary.', 'error');
                    }
                } catch (emailError) {
                    // Non-critical error - don't let it break the session finish
                    console.error("[WeightRecordContext] Non-critical error sending email summary:", emailError);
                }
            } else if (response.error) {
                // Handle offline mode or other errors
                if (response.offline) {
                    console.log('[WeightRecordContext] Offline - session will sync later');
                    showToast('You are offline. Session saved locally.', 'warning');
                } else {
                    console.error("[WeightRecordContext] Failed to create session on server:", response.error);
                    showToast('Error creating session on server. Session saved locally.', 'error');
                }
            }

            console.log('[WeightRecordContext] handleFinished completed successfully');
            return true;

        } catch (error) {
            console.error("[WeightRecordContext] CRITICAL ERROR in handleFinished:", error);
            showToast('Error completing session. Data saved locally.', 'error');
            return false;
        } finally {
            // ✅ CRITICAL: Always execute cleanup, even if errors occur above
            console.log('[WeightRecordContext] Cleaning up session state (finally block)');

            // Clear AsyncStorage
            try {
                await AsyncStorage.removeItem(WEIGHT_SESSION_KEY);
                console.log('[WeightRecordContext] AsyncStorage cleared');
            } catch (error) {
                console.error("[WeightRecordContext] Error removing session from AsyncStorage:", error);
            }

            // CRITICAL: Always set session to not running
            setSessionRunning(false);
            console.log('[WeightRecordContext] Session marked as not running');

            // NOTE: Do NOT reset stats and weightRecordList here!
            // The summary screen needs these stats to display the pie chart.
            // They will be reset when a new session starts (in createWeightSession)
            console.log('[WeightRecordContext] Keeping stats and weightRecordList for summary screen display');

            // Clear finishing flag
            setIsFinishing(false);
            console.log('[WeightRecordContext] Finishing flag cleared');
        }
    }

    const resetWeightState = () => {
        setWeightRecord(initialRecord);
        setWeightRecordList([]);
        setStats({
            total: 0,
            total_female: 0,
            total_male: 0,
            total_weight: 0,
            weight_unit: '',
            ageWeights: [],
            kilo_unit_count: 0,
        });
    }

    const checkDuplicateTag = (tag: string) => {
        return weightRecordList.some((record) => record.tag === tag);
    }

    const getTagList = () => {
        const tagList = weightRecordList.map((record) => record.tag);
        return tagList;
    }

    const recallRecord = (tag: string) => {
        const record = weightRecordList.find((record) => record.tag === tag);
        if (record) {
            setWeightRecord(record);
            return record;
        }
        return initialRecord;
    }

    const createWeightSession = async () => {
        // Reset stats and weightRecordList from previous session before creating new one
        console.log('[WeightRecordContext] Creating new session, resetting previous session data');
        setWeightRecordList([]);
        setStats({
            total: 0,
            total_female: 0,
            total_male: 0,
            total_weight: 0,
            weight_unit: '',
            ageWeights: [],
            kilo_unit_count: 0,
        });

        const newSessionID = await createLocalWeightSession(db);

        if (newSessionID !== undefined) {

            // Create a new session in AsyncStorage, so that the session
            // can be persisted across app restarts
            const asyncStorageSession = {
                device_session_pk: newSessionID,
                session_type: 'weight',
                animal: weightRecord.animal,
                gestation_days: 0,
            }
            await AsyncStorage.setItem(
                WEIGHT_SESSION_KEY,
                JSON.stringify(asyncStorageSession));
            setSessionID(newSessionID);
            setSessionRunning(true);
        }
        setWeightRecord(prev => ({
            ...prev,
            device_session_pk: newSessionID
        }))
    }


    return (
        <WeightRecordContext.Provider value={weightRecord}>
            <WeightRecordMethodContext.Provider value={{
                commitRecord,
                handleFinished,
                getStats: () => stats,
                checkDuplicateTag,
                resetWeightState: resetWeightState,
                createWeightSession: createWeightSession,
                getTagList: getTagList,
                recallRecord: recallRecord,
                isWeightSessionRunning: sessionRunning,
                isWeightFinishing: isFinishing,
                recordCount: weightRecordList.length,
            }}>
                {children}
            </WeightRecordMethodContext.Provider>
        </WeightRecordContext.Provider>
    )

}