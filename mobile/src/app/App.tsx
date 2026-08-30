import React from 'react';
import { StatusBar } from 'react-native';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { AuthProvider } from '../features/auth/AuthContext';
import { RootNavigator } from '../navigation/RootNavigator';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { getMessaging, getInitialNotification, onNotificationOpenedApp } from '@react-native-firebase/messaging';

const linking = {
  prefixes: ['veil://'],
  config: {
    screens: {
      Home: 'home',
      ChatRoom: 'chat/:conversationId',
    },
  },
  async getInitialURL() {
    const messaging = getMessaging();
    const message = await getInitialNotification(messaging);
    if (message?.data?.conversationId) {
      return `veil://chat/${message.data.conversationId}`;
    }
    return null;
  },
  subscribe(listener: (url: string) => void) {
    const messaging = getMessaging();
    const unsubscribe = onNotificationOpenedApp(messaging, (message: any) => {
      if (message?.data?.conversationId) {
        listener(`veil://chat/${message.data.conversationId}`);
      }
    });
    return () => {
      unsubscribe();
    };
  },
};

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <SafeAreaProvider>
          <NavigationContainer theme={DarkTheme} linking={linking}>
            <StatusBar barStyle="light-content" />
            <RootNavigator />
          </NavigationContainer>
        </SafeAreaProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}
