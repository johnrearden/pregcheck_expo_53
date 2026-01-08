import { createContext, useContext, useEffect, useState } from "react";
import {
    addLocalHeatRecord, bulkUpdateHeatRecords, createLocalHeatSession,
    getRecordsForHeatSession,
    removeEmptyHeatSession,
    updateLocalHeatRecord, updateLocalHeatSession
} from "@/utilities/DatabaseUtils";
import { useSQLiteContext } from "expo-sqlite";
import { api } from "@/services/ApiService";
import { useToast } from '../hooks/useToast';
import AsyncStorage from "@react-native-async-storage/async-storage";
import { HEAT_SESSION_KEY } from "@/constants/asyncStorageKeys";

export const initialHeatRecord = {
    id: 0,
    owner: 0,
    tag: '',
    heat_date: '',
    next_heat_date: '',
    note: '',
    server_pk: 0,
    device_session_pk: 0,
    device_pk: 0,
}

export interface HeatRecordType {
    id?: number;
    owner?: number;
    tag: string;
    heat_date: string;
    next_heat_date?: string;
    note?: string;
    server_pk?: number;
    device_session_pk?: number;
    device_pk?: number;
    created_at?: string;
}

export interface HeatStatsType {
    total: number;
}

export interface HeatRecordMethodContextType {
    commitRecord: (record: HeatRecordType) => void;
    handleFinished: () => void;
    getStats: () => HeatStatsType;
    checkDuplicateTag: (tag: string) => boolean;
    resetHeatState: () => void;
    createHeatSession: () => void;
    getTagList: () => string[];
    recallRecord: (tag: string) => HeatRecordType;
    isHeatSessionRunning?: boolean;
    isHeatFinishing?: boolean;
    recordCount: number;
}

export const HeatRecordContext = createContext<HeatRecordType>({
    id: 0,
    owner: 0,
    tag: '',
    heat_date: '',
    next_heat_date: '',
    note: '',
    server_pk: 0,
    device_session_pk: 0,
    device_pk: 0,
});

export const HeatRecordMethodContext = createContext<HeatRecordMethodContextType>({
    commitRecord: () => { },
    handleFinished: () => { },
    getStats: () => {
        return {
            total: 0,
        }
    },
    checkDuplicateTag: () => false,
    resetHeatState: () => { },
    createHeatSession: () => { },
    getTagList: () => [],
    recallRecord: (tag: string) => initialHeatRecord as HeatRecordType,
    isHeatSessionRunning: false,
    isHeatFinishing: false,
    recordCount: 0,
});

export const useHeatRecord = () => useContext(HeatRecordContext);
export const useHeatRecordMethod = () => useContext(HeatRecordMethodContext);

export const HeatRecordProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    console.log('[HeatRecordContext] HeatRecordProvider mounting');

    // Set the initial state of the heat record
    const [heatRecord, setHeatRecord] = useState<HeatRecordType>(initialHeatRecord);

    // Set the initial default state of the sessionID
    const [sessionID, setSessionID] = useState<number>(0);

    // Set the initial state of the sessionRunning flag
    const [sessionRunning, setSessionRunning] = useState<boolean>(false);

    // Set the finishing flag to prevent database access during cleanup
    const [isFinishing, setIsFinishing] = useState<boolean>(false);

    // Get a reference to the SQLite database
    const db = useSQLiteContext();
    console.log('[HeatRecordContext] useSQLiteContext returned:', !!db);

    const showToast = useToast();

    // Set the initial state of the heat record list
    const [heatRecordList, setHeatRecordList] = useState<HeatRecordType[]>([]);

    // Set the initial state of the stats
    const [stats, setStats] = useState<HeatStatsType>({
        total: 0,
    });

    // Check for the existence of a session in AsyncStorage on mount
    useEffect(() => {
        console.log('[HeatRecordContext] useEffect (loadSession) triggered');

        const loadSession = async () => {
            try {
                console.log('[HeatRecordContext] Checking AsyncStorage for existing session...');
                const sessionData = await AsyncStorage.getItem(HEAT_SESSION_KEY);
                if (sessionData) {
                    console.log('[HeatRecordContext] Found existing session in AsyncStorage');
                    const session = JSON.parse(sessionData);
                    setSessionID(session.device_session_pk);
                    setSessionRunning(true);
                    setHeatRecord(prev => ({
                        ...prev,
                        device_session_pk: session.device_session_pk,
                    }));

                    // Load the heat records for this session
                    if (db) {
                        console.log('[HeatRecordContext] Database available, loading records for session:', session.device_session_pk);
                        try {
                            const records = await getRecordsForHeatSession(
                                db,
                                session.device_session_pk
                            )
                            console.log('[HeatRecordContext] Successfully loaded', records?.length || 0, 'records');
                            if (records) {
                                setHeatRecordList(records);
                                setStats({ total: records.length });
                            }
                        } catch (error) {
                            console.error('[HeatRecordContext] FAILED to load records on mount:', error);
                        }
                    } else {
                        console.warn('[HeatRecordContext] Database not available yet, skipping record load');
                    }
                } else {
                    console.log('[HeatRecordContext] No existing session found in AsyncStorage');
                }
            } catch (error: any) {
                console.error('[HeatRecordContext] Error loading session from AsyncStorage:', error);
            }
        }
        loadSession();
    }, []);


    // Save the final record to the database and update local state
    const commitRecord = async (record: HeatRecordType) => {

        const fullRecord = { ...heatRecord, ...record };
        fullRecord.device_session_pk = sessionID;
        console.log('Committing heat record:', fullRecord);

        // Check if the record already has a device_pk (existing record)
        const recordExists = fullRecord.device_pk !== 0;

        if (recordExists) {
            // Update the existing record in the local database
            await updateLocalHeatRecord(db, fullRecord);
        } else {
            // Add this new record to the local database
            const pk = await addLocalHeatRecord(db, fullRecord);
            fullRecord.device_pk = pk;
        }

        if (recordExists) {
            // Replace the edited record in the heatRecordList
            const newRecordList = heatRecordList.map(rec => {
                if (rec.device_pk === fullRecord.device_pk) {
                    return fullRecord;
                }
                return rec;
            })
            setHeatRecordList(newRecordList);
        } else {
            const newRecordList = [...heatRecordList, fullRecord];
            setHeatRecordList(newRecordList);
        }

        // Update the stats
        setStats({
            total: heatRecordList.length + (recordExists ? 0 : 1),
        });

        // Reset the heat record to its initial state
        setHeatRecord(initialHeatRecord);
    }

    const handleFinished = async () => {
        console.log('[HeatRecordContext] handleFinished started, sessionID:', sessionID, 'recordCount:', heatRecordList.length);

        // Set finishing flag to prevent concurrent database access
        setIsFinishing(true);

        try {
            // Check if this session contains any records
            if (heatRecordList.length === 0) {
                console.log('[HeatRecordContext] Empty session, removing from database');
                await removeEmptyHeatSession(db, sessionID);
                return;
            }

            console.log('[HeatRecordContext] Preparing to sync session with', heatRecordList.length, 'records');

            // Create a list of unposted records and a list of posted record ids
            let unpostedRecords = heatRecordList.filter((record) => record.server_pk === 0);
            let postedRecords = heatRecordList.filter((record) => record.server_pk !== 0);
            let postedRecordIds = postedRecords.map((record) => record.server_pk);

            console.log('[HeatRecordContext] Unposted:', unpostedRecords.length, 'Posted:', postedRecords.length);

            let postData = {
                unposted_records: unpostedRecords,
                posted_record_ids: postedRecordIds,
                device_session_pk: sessionID,
            };

            console.log('[HeatRecordContext] Sending session to server...');
            const response = await api.post(
                'exam_session/create_heat_session/',
                postData
            );
            console.log('[HeatRecordContext] Server response received, success:', response.success);

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

                console.log('[HeatRecordContext] Server session created, ID:', server_session_pk);

                // Loop through the unposted records and update their server pk
                const newList = [];
                for (const record of heatRecordList) {
                    const key = `${record.device_pk}`;
                    const server_pk = unposted_record_ids[key];
                    if (server_pk) {
                        record.server_pk = server_pk;
                        record.owner = owner;
                    }
                    record.device_session_pk = server_session_pk;
                    newList.push(record);
                }

                console.log('[HeatRecordContext] Updating local database with server IDs...');
                await bulkUpdateHeatRecords(db, newList, server_session_pk);
                await updateLocalHeatSession(db, server_session_pk, sessionID, heatRecordList.length);
                console.log('[HeatRecordContext] Local database updated successfully');

                // Request email summary
                try {
                    console.log('[HeatRecordContext] Requesting heat summary email for session:', server_session_pk);
                    const summaryResponse = await api.post(
                        'exam_session/send_heat_summary/',
                        { session_id: server_session_pk }
                    );

                    if (!summaryResponse.success) {
                        if (summaryResponse.offline) {
                            console.log('[HeatRecordContext] Offline - email summary skipped');
                        } else if (summaryResponse.error) {
                            console.error('[HeatRecordContext] Failed to send heat summary email:', summaryResponse.error);
                        }
                    } else {
                        console.log('[HeatRecordContext] Heat summary email requested successfully');
                    }
                } catch (emailError) {
                    console.error('[HeatRecordContext] Non-critical error sending heat email:', emailError);
                }

                showToast('Heat records synced successfully.', 'success');
            } else if (response.error) {
                // Handle offline mode or other errors
                if (response.offline) {
                    console.log('[HeatRecordContext] Offline - session will sync later');
                    showToast('You are offline. Session saved locally.', 'warning');
                } else {
                    console.error("[HeatRecordContext] Failed to create session on server:", response.error);
                    showToast('Error creating session on server. Session saved locally.', 'error');
                }
            }

            console.log('[HeatRecordContext] handleFinished completed successfully');
            return true;

        } catch (error) {
            console.error("[HeatRecordContext] CRITICAL ERROR in handleFinished:", error);
            showToast('Error completing session. Data saved locally.', 'error');
            return false;
        } finally {
            // CRITICAL: Always execute cleanup, even if errors occur above
            console.log('[HeatRecordContext] Cleaning up session state (finally block)');

            // Clear AsyncStorage
            try {
                await AsyncStorage.removeItem(HEAT_SESSION_KEY);
                console.log('[HeatRecordContext] AsyncStorage cleared');
            } catch (error) {
                console.error("[HeatRecordContext] Error removing session from AsyncStorage:", error);
            }

            // CRITICAL: Always set session to not running
            setSessionRunning(false);
            console.log('[HeatRecordContext] Session marked as not running');

            // NOTE: Do NOT reset stats and heatRecordList here!
            // The summary screen needs these stats to display.
            // They will be reset when a new session starts (in createHeatSession)
            console.log('[HeatRecordContext] Keeping stats and heatRecordList for summary screen display');

            // Clear finishing flag
            setIsFinishing(false);
            console.log('[HeatRecordContext] Finishing flag cleared');
        }
    }

    const resetHeatState = () => {
        setHeatRecord(initialHeatRecord);
        setHeatRecordList([]);
        setStats({
            total: 0,
        });
    }

    const checkDuplicateTag = (tag: string) => {
        return heatRecordList.some((record) => record.tag === tag);
    }

    const getTagList = () => {
        const tagList = heatRecordList.map((record) => record.tag);
        return tagList;
    }

    const recallRecord = (tag: string) => {
        const record = heatRecordList.find((record) => record.tag === tag);
        if (record) {
            setHeatRecord(record);
            return record;
        }
        return initialHeatRecord;
    }

    const createHeatSession = async () => {
        // Reset stats and heatRecordList from previous session before creating new one
        console.log('[HeatRecordContext] Creating new session, resetting previous session data');
        setHeatRecordList([]);
        setStats({
            total: 0,
        });

        const newSessionID = await createLocalHeatSession(db);

        if (newSessionID !== undefined) {

            // Create a new session in AsyncStorage for crash recovery
            const asyncStorageSession = {
                device_session_pk: newSessionID,
                session_type: 'heat',
            }
            await AsyncStorage.setItem(
                HEAT_SESSION_KEY,
                JSON.stringify(asyncStorageSession));
            setSessionID(newSessionID);
            setSessionRunning(true);
        }
        setHeatRecord(prev => ({
            ...prev,
            device_session_pk: newSessionID
        }))
    }


    return (
        <HeatRecordContext.Provider value={heatRecord}>
            <HeatRecordMethodContext.Provider value={{
                commitRecord,
                handleFinished,
                getStats: () => stats,
                checkDuplicateTag,
                resetHeatState: resetHeatState,
                createHeatSession: createHeatSession,
                getTagList: getTagList,
                recallRecord: recallRecord,
                isHeatSessionRunning: sessionRunning,
                isHeatFinishing: isFinishing,
                recordCount: heatRecordList.length,
            }}>
                {children}
            </HeatRecordMethodContext.Provider>
        </HeatRecordContext.Provider>
    )

}
