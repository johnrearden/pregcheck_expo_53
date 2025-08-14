import 'react-native-gesture-handler';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { router, Slot, Stack } from 'expo-router';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { ErrorProvider } from '@/contexts/ErrorContext';
import { StatsProvider } from '@/contexts/StatsContext';
import { RecordProvider } from '@/contexts/RecordContext';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from "../auth/AuthContext";
import { WeightRecordProvider } from "@/contexts/WeightRecordContext";
import { SQLiteProvider } from "expo-sqlite";
import { migrateDBifNeeded } from "@/utilities/DatabaseUtils";
import { useFonts } from 'expo-font';
import { RecordSyncProvider } from '@/contexts/RecordSyncContext';
import { initializeAds } from '../services/adService';
import { useEffect } from 'react';
import { useAuth } from '../auth/AuthContext';


export default function Layout() {


  const { authenticated } = useAuth();
  if (!authenticated) {
    console.log('User is not authenticated, redirecting to login');
    try {
      router.replace('/(auth)/login');
    } catch (error) {
      console.log('Error redirecting to login:', error);
    }
  }

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
  }, []);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
        <SQLiteProvider databaseName="pregcheck_db" onInit={migrateDBifNeeded}>
          <ThemeProvider>
            <ErrorProvider>
              <StatsProvider>
                <RecordProvider>
                  <WeightRecordProvider>
                    <RecordSyncProvider>
                      <Stack screenOptions={{
                        headerShown: false,
                        gestureEnabled: true,
                        gestureDirection: 'horizontal'
                      }}>
                        {/* <Slot /> */}
                      </Stack>
                      <StatusBar style="light" translucent backgroundColor="transparent" />
                    </RecordSyncProvider>
                  </WeightRecordProvider>
                </RecordProvider>
              </StatsProvider>
            </ErrorProvider>
          </ThemeProvider>
        </SQLiteProvider>
      </AuthProvider>
    </GestureHandlerRootView>
  );
}

