import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
//@ts-ignore
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import { trySync, checkForPendingRecords, checkForPendingWeightRecords } from '@/services/RecordSyncService';
import { RecordType, usePersistRecord } from './RecordContext';
import { WeightRecordType, useWeightRecordMethod } from './WeightRecordContext';
import { useToast } from '@/hooks/useToast';
import { useAuth } from '@/auth/AuthContext';

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
    console.log('[RecordSyncContext] RecordSyncProvider mounting');

    const db = useSQLiteContext();
    const { authenticated, isLoading: authLoading } = useAuth();
    console.log('[RecordSyncContext] useSQLiteContext returned:', !!db);
    console.log('[RecordSyncContext] Auth state - authenticated:', authenticated, 'loading:', authLoading);
    if (!db) {
        console.warn('[RecordSyncContext] SQLite context is not available yet!');
    }
    const [hasUnpostedRecords, setHasUnpostedRecords] = useState(false);
    const [hasUnpostedWeightRecords, setHasUnpostedWeightRecords] = useState(false);
    const [isOnline, setIsOnline] = useState(false);
    const [appState, setAppState] = useState<AppStateStatus>(AppState.currentState);
    const showToast = useToast();
    const { isSessionRunning, isFinishing } = usePersistRecord();
    const sessionRunningRef = useRef(isSessionRunning);
    const finishingRef = useRef(isFinishing);
    const { isWeightSessionRunning, isWeightFinishing } = useWeightRecordMethod();
    const weightSessionRunningRef = useRef(isWeightSessionRunning);
    const weightFinishingRef = useRef(isWeightFinishing);

    // Track if component is mounted to prevent database access after unmount
    const isMountedRef = useRef(true);

    useEffect(() => {
        sessionRunningRef.current = isSessionRunning;
    }, [isSessionRunning]);

    useEffect(() => {
        finishingRef.current = isFinishing;
    }, [isFinishing]);

    useEffect(() => {
        weightSessionRunningRef.current = isWeightSessionRunning;
    }, [isWeightSessionRunning]);

    useEffect(() => {
        weightFinishingRef.current = isWeightFinishing;
    }, [isWeightFinishing]);

    // Add AppState listener to track when app is active/background
    useEffect(() => {
        console.log('[RecordSyncContext] Setting up AppState listener, initial state:', AppState.currentState);

        const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
            console.log('[RecordSyncContext] AppState changed from', appState, 'to', nextAppState);
            setAppState(nextAppState);
        });

        return () => {
            console.log('[RecordSyncContext] Removing AppState listener');
            subscription.remove();
        };
    }, []);

    // Check for unposted records
    const checkUnpostedRecords = useCallback( async () => {
        // CRITICAL: Do not access database if component is unmounted
        if (!isMountedRef.current) {
            console.log('[RecordSyncContext] Component unmounted, skipping unposted records check');
            return;
        }

        // CRITICAL: Only check for unposted records if user is authenticated
        // On fresh install, user hasn't logged in yet, so no records exist
        if (!authenticated) {
            console.log('[RecordSyncContext] User not authenticated, skipping unposted records check');
            return;
        }

        if (!db) {
            console.warn('[RecordSyncContext] Database is not available yet!');
            return;
        }

        // CRITICAL: Only access database when app is active
        if (appState !== 'active') {
            console.log('[RecordSyncContext] Skipping DB access - app state is:', appState);
            return;
        }

        console.log('[RecordSyncContext] Checking for unposted records, AppState:', appState);

        try {
            const unpostedRecords: RecordType[] = await checkForPendingRecords(db);
            if (isMountedRef.current) {
                setHasUnpostedRecords(unpostedRecords.length > 0);
                console.log('[RecordSyncContext] Unposted records:', unpostedRecords.length);
            }
            return unpostedRecords;
        } catch (error) {
            console.error('[RecordSyncContext] CRITICAL ERROR checking for unposted records:', error);
            console.error('[RecordSyncContext] AppState during error:', appState);
        }
    }, [db, appState, isSessionRunning, authenticated])

    const checkUnpostedWeightRecords = useCallback( async () => {
        // CRITICAL: Do not access database if component is unmounted
        if (!isMountedRef.current) {
            console.log('[RecordSyncContext] Component unmounted, skipping weight records check');
            return;
        }

        // CRITICAL: Only check for unposted records if user is authenticated
        // On fresh install, user hasn't logged in yet, so no records exist
        if (!authenticated) {
            console.log('[RecordSyncContext] User not authenticated, skipping weight records check');
            return;
        }

        if (!db) {
            console.warn('[RecordSyncContext] Database is not available yet!');
            return;
        }

        // CRITICAL: Only access database when app is active
        if (appState !== 'active') {
            console.log('[RecordSyncContext] Skipping weight DB access - app state is:', appState);
            return;
        }

        console.log('[RecordSyncContext] Checking for unposted weight records, AppState:', appState);

        try {
            const unpostedWeightRecords: WeightRecordType[] = await checkForPendingWeightRecords(db);
            if (isMountedRef.current) {
                setHasUnpostedWeightRecords(unpostedWeightRecords.length > 0);
                console.log('[RecordSyncContext] Unposted weight records:', unpostedWeightRecords.length);
            }
            return unpostedWeightRecords;
        } catch (error) {
            console.error('[RecordSyncContext] CRITICAL ERROR checking for unposted weight records:', error);
            console.error('[RecordSyncContext] AppState during error:', appState);
        }
    }, [db, appState, isWeightSessionRunning, authenticated])

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
        console.log('[RecordSyncContext] Initializing periodic check interval, AppState:', appState, 'DB available:', !!db, 'Authenticated:', authenticated);

        // Initial check (only if app is active AND database is available AND user is authenticated)
        if (appState === 'active' && db && authenticated) {
            checkUnpostedRecords();
            checkUnpostedWeightRecords();
        } else {
            console.log('[RecordSyncContext] Skipping initial check - appState:', appState, 'db:', !!db, 'authenticated:', authenticated);
        }

        const interval = setInterval(() => {
            // CRITICAL: Do not run interval callback if component is unmounted
            if (!isMountedRef.current) {
                console.log('[RecordSyncContext] Component unmounted, skipping interval check');
                return;
            }

            console.log('[RecordSyncContext] Interval fired, AppState:', appState);

            // CRITICAL: Skip if app is not active (backgrounded)
            if (appState !== 'active') {
                console.log('[RecordSyncContext] App not active, skipping interval check');
                return;
            }

            if (sessionRunningRef.current || weightSessionRunningRef.current || finishingRef.current || weightFinishingRef.current) {
                console.log('[RecordSyncContext] Session is running or finishing, skipping sync check');
                return;
            }

            console.log('[RecordSyncContext] Executing periodic sync check...');
            checkUnpostedRecords();
            checkUnpostedWeightRecords();
        }, 60 * 1000); // Check every minute

        return () => {
            console.log('[RecordSyncContext] Clearing interval and marking as unmounted');
            isMountedRef.current = false;
            clearInterval(interval);
        }
    }, [db, isOnline, appState, authenticated]);



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
