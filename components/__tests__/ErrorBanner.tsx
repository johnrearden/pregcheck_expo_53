import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useError } from '@/contexts/ErrorContext';
import { useTheme } from '@/hooks/useTheme';

interface ErrorBannerProps {
  message?: string;
}

const ErrorBanner: React.FC<ErrorBannerProps> = ({ message }) => {
  const { hasError, errorMessage, clearError } = useError();
  const { colors } = useTheme();
  
  // Only show if we have an error
  if (!hasError && !message) return null;
  
  const displayMessage = message || errorMessage || 'An unknown error occurred';

  return (
    <View style={[styles.container, { backgroundColor: colors.error }]}>
      <Text style={styles.text}>{displayMessage}</Text>
      <TouchableOpacity onPress={clearError} style={styles.button}>
        <Text style={styles.buttonText}>✕</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    padding: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 1000,
  },
  text: {
    color: 'white',
    fontWeight: 'bold',
    flex: 1,
  },
  button: {
    padding: 5,
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
});

export default ErrorBanner;
