import * as SecureStore from 'expo-secure-store';

type AuthToken = string;

export const API_URL = "https://pregcheck.ai/api/v1/";
//export const API_URL = "http://192.168.1.6:8000/api/v1/";
//export const API_URL = "http://172.237.100.205/api/v1/";
const TOKEN_KEY = 'access';

export const getStoredToken = async () => {
    try {
        return await SecureStore.getItemAsync('TOKEN_KEY');
    } catch (error) {
        console.error('Failed to get stored token:', error);
        return null;
    }
};

export const storeToken = async (token: AuthToken) => {
    try {
        await SecureStore.setItemAsync('TOKEN_KEY', token);
    } catch (error) {
        console.error('Failed to store token:', error);
    }
};


// Logout
export const clearTokens = async () => {
    try {
        await SecureStore.deleteItemAsync('TOKEN_KEY');
    } catch (error) {
        console.error('Failed to clear tokens:', error);
    }
};

