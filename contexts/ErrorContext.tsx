import React, { createContext, useContext, useState, useCallback } from "react";
import { Alert } from "react-native";
import { ApiError } from "@/services/ApiService";

interface ErrorContextType {
  hasError: boolean;
  errorMessage: string | null;
  setError: (error: ApiError) => void;
  clearError: () => void;
  showErrorAlert: (error: ApiError) => void;
}

const initialState = {
  hasError: false,
  errorMessage: null,
  setError: () => {},
  clearError: () => {},
  showErrorAlert: () => {}
};

const ErrorContext = createContext<ErrorContextType>(initialState);

export const useError = () => useContext(ErrorContext);

export const ErrorProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Set the current error state
  const setError = useCallback((error: ApiError) => {
    setHasError(true);
    setErrorMessage(error.message || "An unknown error occurred");
    console.error("Application error:", error);
  }, []);

  // Clear the current error state
  const clearError = useCallback(() => {
    setHasError(false);
    setErrorMessage(null);
  }, []);

  // Show an alert dialog with the error message
  const showErrorAlert = useCallback((error: ApiError) => {
    Alert.alert(
      "Error",
      error.message || "An unknown error occurred",
      [{ text: "OK", onPress: clearError }]
    );
  }, [clearError]);

  return (
    <ErrorContext.Provider
      value={{
        hasError,
        errorMessage,
        setError,
        clearError,
        showErrorAlert
      }}
    >
      {children}
    </ErrorContext.Provider>
  );
};
