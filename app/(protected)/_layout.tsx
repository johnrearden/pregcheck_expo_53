import { useAuth } from '@/auth/AuthContext';
import { Stack, useRouter } from 'expo-router';
import { useEffect } from 'react';


export default function ProtectedLayout() {
    const { authenticated, isLoading } = useAuth();
    const router = useRouter();

    console.log('[ProtectedLayout] Rendering - authenticated:', authenticated, 'isLoading:', isLoading);

    useEffect(() => {
        console.log('[ProtectedLayout] useEffect fired - authenticated:', authenticated, 'isLoading:', isLoading);

        // Only redirect if auth check is complete AND user is not authenticated
        // This prevents redirect during the async token check on app resume
        if (!isLoading && !authenticated) {
            console.log('[ProtectedLayout] User is not authenticated, redirecting to login');
            try {
                router.replace('/(auth)/login');
            } catch (error) {
                console.log('[ProtectedLayout] Error redirecting to login:', error);
            }
        } else {
            console.log('[ProtectedLayout] Not redirecting - isLoading:', isLoading, 'authenticated:', authenticated);
        }
    }, [authenticated, isLoading, router]);

    // Show nothing while checking authentication status
    if (isLoading || !authenticated) {
        console.log('[ProtectedLayout] Returning null - isLoading:', isLoading, 'authenticated:', authenticated);
        return null; // or a loading spinner
    }

    console.log('[ProtectedLayout] Rendering Stack navigation');
    return (
        <Stack screenOptions={{
            headerShown: false,
            
        }}>
            <Stack.Screen
                name="index"
                options={
                    {
                        headerShown: false,
                        gestureEnabled: true,
                        gestureDirection: 'horizontal',
                    }
                } />
            <Stack.Screen
                name="settings"
                options={
                    {
                        headerShown: false,
                        gestureEnabled: true,
                        gestureDirection: 'horizontal',
                    }
                } />
            <Stack.Screen
                name="search_type_choice"
                options={
                    {
                        headerShown: false,
                        gestureEnabled: true,
                        gestureDirection: 'horizontal',
                    }
                } />
            {/* <Slot /> */}
        </Stack>

    );
}
