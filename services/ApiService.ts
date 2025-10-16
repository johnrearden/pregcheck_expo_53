import { apiCall } from "@/auth/ApiCall";
//@ts-ignore
import NetInfo from '@react-native-community/netinfo';

/**
 * Error type for API calls
 */
export interface ApiError {
    status: number;
    message: string;
    details?: any;
    timestamp: string;
    isOffline?: boolean;
}

/**
 * API response wrapper that includes status and data
 */
export interface ApiResponse<T> {
    data?: T;
    error?: ApiError;
    loading: boolean;
    success: boolean;
    offline?: boolean;
}

/**
 * Options for API requests
 */
export interface ApiOptions {
    retries?: number;
    retryDelay?: number;
    timeout?: number;
}

// Default API options
const DEFAULT_OPTIONS: ApiOptions = {
    retries: 3, // Increased from 2 to 3 retries
    retryDelay: 2000, // Increased from 1s to 2s to give network time to stabilize
    timeout: 10000,
};

/**
 * Check if the device is currently online
 */
export async function isOnline(): Promise<boolean> {
    const state = await NetInfo.fetch();
    return state.isConnected === true && state.isInternetReachable !== false;
}

/**
 * A middleware-style function to handle errors from API calls
 */
export async function withErrorHandling<T>(
    apiPromiseFn: () => Promise<T>,
    options: ApiOptions = DEFAULT_OPTIONS
): Promise<ApiResponse<T>> {
    let retries = options.retries || 0;

    // First check if we're online
    const online = await isOnline();
    if (!online) {
        const offlineError: ApiError = {
            status: 0,
            message: "You are offline. The operation will be stored locally.",
            isOffline: true,
            timestamp: new Date().toISOString(),
        };
        console.log("Network offline:", offlineError);
        return { error: offlineError, loading: false, success: false, offline: true };
    }

    // Try the API call with retries
    while (true) {
        try {
            const data = await apiPromiseFn();
            return { data, loading: false, success: true };
        } catch (error: any) {
            // Decrement retry counter
            retries--;

            // Check if this is a network connectivity error
            const isNetworkError = error.message?.includes('Network request failed') ||
                                   error.message?.includes('Failed to fetch') ||
                                   error.message?.includes('network');

            // Format error consistently
            const apiError: ApiError = {
                status: error.status || 500,
                message: error.message || "Unknown error occurred",
                details: error.details || error,
                timestamp: new Date().toISOString(),
            };

            // If we have retries left, wait and then loop again
            if (retries >= 0) {
                console.log(`[ApiService] ${isNetworkError ? 'Network error' : 'Error'}, retrying in ${options.retryDelay || DEFAULT_OPTIONS.retryDelay}ms... (${retries} retries left)`);
                await new Promise((resolve) =>
                    setTimeout(resolve, options.retryDelay || DEFAULT_OPTIONS.retryDelay)
                );
                continue;
            }

            // No retries left, return error with better message for network errors
            if (isNetworkError) {
                apiError.message = "Network not ready. Please wait a moment and try again.";
            }
            console.error("API Error (no retries left):", apiError);
            return { error: apiError, loading: false, success: false };
        }
    }
}

/**
 * Enhanced API methods with error handling
 */
export const api = {
    /**
     * Make a GET request with error handling
     */
    async get<T>(endpoint: string, options?: ApiOptions): Promise<ApiResponse<T>> {
        return withErrorHandling(
            () => apiCall(endpoint, "GET", null),
            options
        );
    },

    /**
     * Make a POST request with error handling
     */
    async post<T>(endpoint: string, data: any, options?: ApiOptions): Promise<ApiResponse<T>> {
        return withErrorHandling(
            () => apiCall(endpoint, "POST", data),
            options
        );
    },

    /**
     * Make a PUT request with error handling
     */
    async put<T>(endpoint: string, data: any, options?: ApiOptions): Promise<ApiResponse<T>> {
        return withErrorHandling(
            () => apiCall(endpoint, "PUT", data),
            options
        );
    },

    /**
     * Make a DELETE request with error handling
     */
    async delete<T>(endpoint: string, options?: ApiOptions): Promise<ApiResponse<T>> {
        return withErrorHandling(
            () => apiCall(endpoint, "DELETE", null),
            options
        );
    }
};
