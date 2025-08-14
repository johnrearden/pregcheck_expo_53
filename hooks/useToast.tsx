import { Alert } from 'react-native';
import { useCallback } from 'react';

type ToastType = 'info' | 'success' | 'warning' | 'error';

/**
 * A simple hook to show toast-like messages
 * Currently uses Alert since it's the simplest way to display messages
 * but could be enhanced to use a custom toast component
 */
export function useToast() {
  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    let title = 'Information';
    
    switch (type) {
      case 'success':
        title = 'Success';
        break;
      case 'warning':
        title = 'Warning';
        break;
      case 'error':
        title = 'Error';
        break;
    }
    
    Alert.alert(
      title,
      message,
      [{ text: 'OK' }]
    );
  }, []);
  
  return showToast;
}
