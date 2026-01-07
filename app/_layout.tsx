import { ErrorProvider } from '@/contexts/ErrorContext';
import { HeatRecordProvider } from '@/contexts/HeatRecordContext';
import { RecordProvider } from '@/contexts/RecordContext';
import { RecordSyncProvider } from '@/contexts/RecordSyncContext';
import { StatsProvider } from '@/contexts/StatsContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { WeightRecordProvider } from "@/contexts/WeightRecordContext";
import { useTheme } from '@/hooks/useTheme';
import { migrateDBifNeeded } from "@/utilities/DatabaseUtils";
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { SQLiteProvider } from "expo-sqlite";
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import 'react-native-gesture-handler';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AuthProvider } from "../auth/AuthContext";
import { initializeAds } from '../services/adService';

// Create a separate component for handling auth routing
function AuthenticatedApp() {
  console.log('[_layout] AuthenticatedApp function re-executed');
  console.log('[_layout] AuthenticatedApp component rendering');

  const { colors } = useTheme();

  // NOTE: Removed database reconnection logic on app resume
  // expo-sqlite with WAL mode handles backgrounding correctly
  // Forced reconnection was causing auth redirect issues

  // Error handler for SQLiteProvider
  const handleDatabaseError = (error: Error) => {
    // WAL mode switching can cause transient "database is locked" errors during initialization
    // These are safe to ignore as the operation retries and succeeds
    const errorMessage = error?.message || '';
    const errorCode = (error as any)?.code;

    console.error('[SQLiteProvider] Database error caught:', {
      code: errorCode,
      message: errorMessage,
      timestamp: new Date().toISOString()
    });

    if (errorCode === 'ERR_INTERNAL_SQLITE_ERROR' && errorMessage.includes('database is locked')) {
      console.warn('[SQLiteProvider] Transient database lock during WAL initialization (safe to ignore)');
      return;
    }

    console.error('[SQLiteProvider] Non-transient database error:', error);
    // Log the error but don't crash the app
    // The database will be re-initialized on next operation
  };

  console.log('[_layout] Rendering SQLiteProvider');

  return (
    <SQLiteProvider
      databaseName="pregcheck_db"
      onInit={migrateDBifNeeded}
      onError={handleDatabaseError}
    >
      <ThemeProvider>
        <ErrorProvider>
          <StatsProvider>
            <RecordProvider>
              <WeightRecordProvider>
                <HeatRecordProvider>
                  <RecordSyncProvider>
                  <StatusBar style="light" backgroundColor={colors.brgtColor} />
                  <SafeAreaView style={{
                    flex: 1,
                    backgroundColor: colors.brgtColor,
                  }}>
                    <Stack screenOptions={{
                      headerShown: false,
                      gestureEnabled: true,
                      gestureDirection: 'horizontal'
                    }}>
                      {/* Stack will automatically render the appropriate screen based on routes */}
                    </Stack>

                  </SafeAreaView>
                  </RecordSyncProvider>
                </HeatRecordProvider>
              </WeightRecordProvider>
            </RecordProvider>
          </StatsProvider>
        </ErrorProvider>
      </ThemeProvider>
    </SQLiteProvider>
  );
}

export default function Layout() {
  console.log('[_layout] Layout function re-executed');
  console.log('[_layout] Root Layout component rendering');

  const [fontsLoaded] = useFonts({
    'Nunito': require('../assets/fonts/Nunito-VariableFont_wght.ttf'),
  });

  console.log('[_layout] Fonts loaded:', fontsLoaded);

  // Initialize ads when the app starts
  useEffect(() => {
    console.log('[_layout] useEffect triggered, fontsLoaded:', fontsLoaded);

    if (!fontsLoaded) {
      console.log('[_layout] Fonts not loaded yet, skipping ads initialization');
      return;
    }

    console.log('[_layout] Initializing ads...');
    initializeAds()
      .then(() => console.log('[_layout] Ads initialized successfully'))
      .catch(error => console.warn('[_layout] Ads initialization error:', error));
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    console.log('[_layout] Fonts not loaded, returning null (loading screen)');
    return null;
  }

  console.log('[_layout] Rendering app providers');

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
        <AuthenticatedApp />
      </AuthProvider>
    </GestureHandlerRootView>
  );
}