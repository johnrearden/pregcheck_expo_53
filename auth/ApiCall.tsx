import { getStoredToken, API_URL, clearTokens } from '../utilities/AuthUtils';
import { router } from 'expo-router';


export const apiCall = async (
    endpoint: string,
    method: string = 'GET',
    body: Object | null = null,
) => {
    try {
        let token = await getStoredToken();
        const headers = {
            'Content-Type': 'application/json',
            Authorization: `Token ${token}`,
        };

        const config = {
            method,
            headers,
            body: body ? JSON.stringify(body) : null,
        };

        // console.log(`[API] Request: ${method} ${API_URL}${endpoint}`, {
        //     method,
        //     headers,
        //     body,
        // });

        let response = await fetch(`${API_URL}${endpoint}`, config);

        // this error appears when the token is expired/invalid
        if (response.status === 401) {
            alert('Session expired');
            await clearTokens();
            router.replace('/login');
            throw new Error('Session expired');
        }

        if (!response.ok) {
            throw new Error('Request failed');
        }

        const json = await response.json();
        return json;
    } catch (error) {
        console.error('API call failed:', error);
        throw error;
    }
};