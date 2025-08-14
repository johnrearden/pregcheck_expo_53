import { Slot, Stack, useRouter } from 'expo-router';
import { useAuth } from '@/auth/AuthContext';
import { useEffect } from 'react';


export default function ProtectedLayout() {
    const { authenticated } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!authenticated) {
            console.log('User is not authenticated, redirecting to login');
            try {
                router.replace('/(auth)/login');
            } catch (error) {
                console.log('Error redirecting to login:', error);
            }

        }
    }, [authenticated, router]);

    if (!authenticated) {
        return null; // or a loading spinner
    }
    return (
        <Stack screenOptions={{ headerShown: false }}>
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
