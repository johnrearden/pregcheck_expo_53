import { usePathname, useRouter } from 'expo-router';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { Alert } from 'react-native';
import {
    API_URL,
    clearTokens,
    getStoredToken,
    storeToken
} from '../utilities/AuthUtils';

export interface AuthContextType {
    login: (username: string, password: string) => Promise<any>;
    register: (
        username: string,
        email: string,
        password1: string,
        password2: string) => Promise<any>;
    logout: () => Promise<void>;
    authenticated: boolean;
    requestPasswordReset: (email: string) => Promise<any>;
    confirmPasswordReset: (email: string, code: string, new_password1: string, new_password2: string) => Promise<any>;
    isLoading: boolean; // Add this to help with loading states
}

export const AuthContext = createContext<AuthContextType>({
    login: async () => { },
    register: async () => { },
    logout: async () => { },
    authenticated: false,
    requestPasswordReset: async () => { },
    confirmPasswordReset: async () => { },
    isLoading: true,
});

interface AuthProviderProps {
    children: React.ReactNode;
}

// AuthProvider component that provides authentication context to the application
export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
    const [isLoading, setIsLoading] = useState(true);
    const [authenticated, setAuthenticated] = useState(false);
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        const checkForToken = async () => {
            try {
                const token = await getStoredToken();
                if (token) {
                    setAuthenticated(true);
                    console.log('Token found:', token);
                } else {
                    console.log('No token found in storage');
                    setAuthenticated(false);
                }
            } catch (error) {
                console.error('Error checking token:', error);
                setAuthenticated(false);
            } finally {
                setIsLoading(false);
            }
        };

        checkForToken();
    }, []); // Only run once on mount

    // Separate effect to handle redirects based on auth state
    useEffect(() => {
        if (!isLoading) {
            if (!authenticated && pathname !== '/login' && pathname !== '/register') {
                router.replace('/login');
            }
        }
    }, [authenticated, isLoading, pathname]);

    const login = async (username: string, password: string) => {
        try {
            const response = await fetch(`${API_URL}dj-rest-auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username, password }),
            });
            if (!response.ok) {
                throw new Error('Login failed');
            }

            const data = await response.json();
            setAuthenticated(true);
            await storeToken(data.key);
            return data.user;
        } catch (error) {
            throw error;
        }
    };

    const register = async (
        username: string,
        email: string,
        password1: string,
        password2: string) => {
        try {
            const response = await fetch(`${API_URL}dj-rest-auth/registration/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username, email, password1, password2 }),
            });

            console.log('Registration response status:', response.status);
            console.log('Response.ok:', response.ok);

            if (!response.ok) {
                const contentType = response.headers.get('content-type');

                if (contentType && contentType.includes('application/json')) {
                    const errorData = await response.json();
                    errorData._isValidationError = true;
                    throw errorData;
                } else {
                    const errorText = await response.text();
                    throw new Error(`Server error: ${response.status}. ${errorText}`);
                }
            }

            const data = await response.json();
            await storeToken(data.key);
            setAuthenticated(true);
            return data;
        } catch (error) {
            console.error('Registration error:', error);
            if (!(typeof error === 'object' && error !== null && '_isValidationError' in error)) {
                Alert.alert(
                    'Connection Error',
                    'Unable to connect to the server. Please check your internet connection and try again.',
                    [{ text: 'OK', onPress: () => console.log('Network error acknowledged') }]
                );
            }
            throw error;
        }
    };

    const requestPasswordReset = async (email: string) => {
        try {
            const response = await fetch(`${API_URL}custom_auth/password_reset/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(
                    errorData.email?.[0] ||
                    'Password reset request failed. Please try again.'
                );
            }

            if (response.status === 204) {
                return { success: true, message: 'Password reset email sent successfully.' };
            }

            try {
                const data = await response.json();
                return data;
            } catch (e) {
                return { success: true, message: 'Password reset email sent successfully.' };
            }
        } catch (error) {
            console.error('Password reset error:', error);
            throw error;
        }
    };

    const confirmPasswordReset = async (email: string, code: string, new_password1: string, new_password2: string) => {
        try {
            const response = await fetch(`${API_URL}custom_auth/password_reset/confirm/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email,
                    code,
                    new_password1,
                    new_password2
                }),
            });

            if (!response.ok) {
                const contentType = response.headers.get('content-type');

                if (contentType && contentType.includes('application/json')) {
                    const errorData = await response.json();
                    let errorMessage = 'Password reset failed. Please try again.';

                    if (errorData.email) {
                        errorMessage = Array.isArray(errorData.email) ? errorData.email[0] : errorData.email;
                    } else if (errorData.code) {
                        errorMessage = Array.isArray(errorData.code) ? errorData.code[0] : errorData.code;
                    } else if (errorData.new_password1) {
                        errorMessage = Array.isArray(errorData.new_password1) ? errorData.new_password1[0] : errorData.new_password1;
                    } else if (errorData.new_password2) {
                        errorMessage = Array.isArray(errorData.new_password2) ? errorData.new_password2[0] : errorData.new_password2;
                    } else if (errorData.non_field_errors) {
                        errorMessage = Array.isArray(errorData.non_field_errors) ? errorData.non_field_errors[0] : errorData.non_field_errors;
                    }

                    throw new Error(errorMessage);
                } else {
                    const textResponse = await response.text();
                    console.error('Non-JSON error response:', textResponse);
                    throw new Error('Password reset failed. Please try again.');
                }
            }

            const data = await response.json();

            if (data.key || data.token) {
                const authToken = data.key || data.token;
                await storeToken(authToken);
            }

            return data;
        } catch (error) {
            console.error('Password reset confirmation error:', error);
            throw error;
        }
    };

    const logout = async () => {
        await clearTokens();
        setAuthenticated(false);
        router.replace('/login');
    };

    return (
        <AuthContext.Provider value={{
            login, 
            register, 
            logout, 
            requestPasswordReset, 
            confirmPasswordReset, 
            authenticated,
            isLoading
        }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);