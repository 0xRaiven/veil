import React from 'react';
import { StatusBar } from 'react-native';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { AuthProvider } from '../features/auth/AuthContext';
import { RootNavigator } from '../navigation/RootNavigator';

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <NavigationContainer theme={DarkTheme}>
          <StatusBar barStyle="light-content" />
          <RootNavigator />
        </NavigationContainer>
      </AuthProvider>
    </ErrorBoundary>
  );
}
