import React, { createContext, useState, useEffect } from 'react';
import { ReactNode } from 'react';
import * as SecureStore from 'expo-secure-store';
import { useColorScheme } from 'react-native';


export const ThemeContext = createContext({
  theme: 'light',
  toggleTheme: () => {},
});

const THEME_STORAGE_KEY = 'app_theme';

// ThemeProvider component to manage theme state and provide it to the app
// It uses SecureStore to persist the theme selection across app sessions
// It also listens to system color scheme changes and applies the appropriate theme
export function ThemeProvider({ children }: { children: ReactNode }) {
  console.log('[ThemeContext] ThemeProvider rendering');

  const systemColorScheme = useColorScheme();
  const [theme, setTheme] = useState('light');

  console.log('[ThemeContext] Current theme state:', theme);

  useEffect(() => {
    console.log('[ThemeContext] useEffect for loadSavedTheme triggered');
    loadSavedTheme();
  }, []);

  const loadSavedTheme = async () => {
    console.log('[ThemeContext] loadSavedTheme called');
    try {
      const savedTheme = await SecureStore.getItemAsync(THEME_STORAGE_KEY);
      console.log('[ThemeContext] Saved theme from SecureStore:', savedTheme);
      if (savedTheme) {
        console.log('[ThemeContext] Setting theme to saved value:', savedTheme);
        setTheme(savedTheme);
      } else {
        // Use system theme as default if no saved theme
        console.log('[ThemeContext] No saved theme, using system theme:', systemColorScheme);
        setTheme(systemColorScheme || 'light');
      }
    } catch (error) {
      console.error('Failed to load theme:', error);
    }
  };

  const toggleTheme = async () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    try {
      await SecureStore.setItemAsync(THEME_STORAGE_KEY, newTheme);
    } catch (error) {
      console.error('Failed to save theme:', error);
    }
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}