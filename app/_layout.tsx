import { ErrorProvider } from '@/contexts/ErrorContext';
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
import { useEffect } from 'react';
import 'react-native-gesture-handler';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AuthProvider } from "../auth/AuthContext";
import { initializeAds } from '../services/adService';

// Create a separate component for handling auth routing
function AuthenticatedApp() {

  const { colors } = useTheme();

  return (
    <SQLiteProvider databaseName="pregcheck_db" onInit={migrateDBifNeeded}>
      <ThemeProvider>
        <ErrorProvider>
          <StatsProvider>
            <RecordProvider>
              <WeightRecordProvider>
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
              </WeightRecordProvider>
            </RecordProvider>
          </StatsProvider>
        </ErrorProvider>
      </ThemeProvider>
    </SQLiteProvider>
  );
}

export default function Layout() {
  const [fontsLoaded] = useFonts({
    'Nunito': require('../assets/fonts/Nunito-VariableFont_wght.ttf'),
  });

  // Initialize ads when the app starts
  useEffect(() => {
    if (!fontsLoaded) {
      return;
    }

    initializeAds()
      .then(() => console.log('Ads initialized successfully'))
      .catch(error => console.warn('Ads initialization error:', error));
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
        <AuthenticatedApp />
      </AuthProvider>
    </GestureHandlerRootView>
  );
}