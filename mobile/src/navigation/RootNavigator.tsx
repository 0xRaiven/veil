import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../features/auth/AuthContext';
import { LoadingScreen } from '../components/LoadingScreen';
import { AuthNavigator } from './AuthNavigator';
import { AppNavigator } from './AppNavigator';
import { MfaChallengeScreen } from '../features/auth/screens/MfaChallengeScreen';

const Stack = createNativeStackNavigator();

export const RootNavigator = () => {
  const { session, isLoading, aal, nextAal } = useAuth();

  if (isLoading) {
    return <LoadingScreen />;
  }

  // 1. Not logged in -> Auth flow
  if (!session) {
    return <AuthNavigator />;
  }

  // 2. Logged in, but enrolled in MFA and currently only AAL1 -> Force MFA Challenge
  if (nextAal === 'aal2' && aal !== 'aal2') {
    return (
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="MfaChallenge" component={MfaChallengeScreen} />
      </Stack.Navigator>
    );
  }

  // 3. Logged in, no MFA required or MFA already satisfied -> Main App
  return <AppNavigator />;
};
