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
  const systemColorScheme = useColorScheme();
  const [theme, setTheme] = useState('light');
 
  useEffect(() => {
    loadSavedTheme();
  }, []);

  const loadSavedTheme = async () => {
    try {
      const savedTheme = await SecureStore.getItemAsync(THEME_STORAGE_KEY);
      if (savedTheme) {
        setTheme(savedTheme);
      } else {
        // Use system theme as default if no saved theme
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