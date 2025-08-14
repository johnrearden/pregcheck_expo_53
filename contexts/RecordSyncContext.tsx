import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useSQLiteContext } from 'expo-sqlite';
//@ts-ignore
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import { trySync, checkForPendingRecords, checkForPendingWeightRecords } from '@/services/RecordSyncService';
import { RecordType, usePersistRecord } from './RecordContext';
import { WeightRecordType, useWeightRecordMethod } from './WeightRecordContext';
import { useToast } from '@/hooks/useToast';

interface RecordSyncContextType {
    hasUnpostedRecords: boolean;
    hasUnpostedWeightRecords: boolean;
    isOnline: boolean;
    syncRecords: () => Promise<void>;
}

const RecordSyncContext = createContext<RecordSyncContextType>({
    hasUnpostedRecords: false,
    hasUnpostedWeightRecords: false,
    isOnline: false,
    syncRecords: async () => { },
});

export const useRecordSync = () => useContext(RecordSyncContext);

export const RecordSyncProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const db = useSQLiteContext();
    if (!db) {
        console.warn('SQLite context is not available yet!');
    }
    const [hasUnpostedRecords, setHasUnpostedRecords] = useState(false);
    const [hasUnpostedWeightRecords, setHasUnpostedWeightRecords] = useState(false);
    const [isOnline, setIsOnline] = useState(false);
    const showToast = useToast();
    const { isSessionRunning } = usePersistRecord();
    const sessionRunningRef = useRef(isSessionRunning);
    const { isWeightSessionRunning } = useWeightRecordMethod();
    const weightSessionRunningRef = useRef(isWeightSessionRunning);

    useEffect(() => {
        sessionRunningRef.current = isSessionRunning;
    }, [isSessionRunning]);

    useEffect(() => {
        weightSessionRunningRef.current = isWeightSessionRunning;
    }, [isWeightSessionRunning]);

    // Check for unposted records
    const checkUnpostedRecords = useCallback( async () => {

        if (!db) {
            console.warn('Database is not available yet!');
            return;
        }
        try {
            const unpostedRecords: RecordType[] = await checkForPendingRecords(db);
            setHasUnpostedRecords(unpostedRecords.length > 0);
            // console.log('Unposted records:', unpostedRecords.length);
            return unpostedRecords;
        } catch (error) {
            console.error('Error checking for unposted records:', error);
        }
    }, [isSessionRunning])

    const checkUnpostedWeightRecords = useCallback( async () => {
        if (!db) {
            console.warn('Database is not available yet!');
            return;
        }
        try {
            const unpostedWeightRecords: WeightRecordType[] = await checkForPendingWeightRecords(db);
            setHasUnpostedWeightRecords(unpostedWeightRecords.length > 0);
            // console.log(`Unposted weight records: ${unpostedWeightRecords.length}`);
            return unpostedWeightRecords;
        } catch (error) {
            console.error('Error checking for unposted weight records:', error);
        }
    }, [isWeightSessionRunning])

    // Sync records with the server
    const syncRecords = async () => {
        if (!isOnline) return;

        // Check for unposted records again before syncing
        const records = await checkUnpostedRecords();
        const weightRecords = await checkUnpostedWeightRecords();
        if (records?.length === 0 && weightRecords?.length === 0) {
            console.log('No unposted records to sync.');
            return;
        } else {
            if (records && records?.length > 0) {
                console.log('Unposted records found:', records);
            } else if (weightRecords && weightRecords?.length > 0) {
                console.log('Unposted weight records found:', weightRecords);
            }
        }
        try {
            await trySync(
                db,
                records || [],
                weightRecords || [],
                showToast);
            setHasUnpostedRecords(false);
            setHasUnpostedWeightRecords(false);
        } catch (error) {
            console.error('Error syncing records:', error);
        }

    };

    // Add a listener to check network status
    useEffect(() => {
        const unsubscribe: () => void = NetInfo.addEventListener((state: NetInfoState) => {
            setIsOnline(state.isConnected ?? false);
        });

        return () => unsubscribe();
    }, []);

    // Check for unposted records periodically
    useEffect(() => {
        checkUnpostedRecords();
        checkUnpostedWeightRecords();

        const interval = setInterval(() => {
            if (sessionRunningRef.current || weightSessionRunningRef.current) {
                //console.log('Session is running, skipping sync check.');
                return;
            }
            // console.log('isSessionRunning in interval:', sessionRunningRef.current);
            // console.log('isWeightSessionRunning in interval:', weightSessionRunningRef.current);
            checkUnpostedRecords();
            checkUnpostedWeightRecords();
            // console.log('Checking for unposted records...');
        }, 60 * 1000); // Check every minute

        return () => {
            console.log('Clearing interval');
            clearInterval(interval);
        }
    }, [db, isOnline]);



    return (
        <RecordSyncContext.Provider
            value={{
                hasUnpostedRecords,
                hasUnpostedWeightRecords,
                isOnline,
                syncRecords,
            }}
        >
            {children}
        </RecordSyncContext.Provider>
    );
};
