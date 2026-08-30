import React from 'react';
import { View, Text, Button, StyleSheet } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { supabase } from '../services/supabase/client';
import { MfaSetupScreen } from '../features/auth/screens/MfaSetupScreen';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

// We will replace the placeholder HomeScreen entirely since the prompt asks for
// a Settings Hub as the foundation. We can use SettingsHub as the main view for now,
// or keep a blank Home and add a Settings button. Let's make Home just have a Settings button.
const HomeScreen = () => {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  return (
    <View style={styles.container}>
      <Text style={styles.title}>VEIL</Text>
      <Text style={styles.subtitle}>Stage 3 Foundation</Text>
      <View style={styles.buttonContainer}>
        <Button title="Open Settings" onPress={() => navigation.navigate('SettingsHub')} color="#4A90E2" />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 20, backgroundColor: '#000' },
  title: { fontSize: 24, fontWeight: 'bold', color: '#fff', marginBottom: 10, textAlign: 'center' },
  subtitle: { fontSize: 16, color: '#ccc', marginBottom: 30, textAlign: 'center' },
  buttonContainer: { marginTop: 15 }
});

import { SettingsHubScreen } from '../features/settings/screens/SettingsHubScreen';
import { ProfileScreen } from '../features/settings/screens/ProfileScreen';

const Stack = createNativeStackNavigator();

export const AppNavigator = () => {
  return (
    <Stack.Navigator screenOptions={{ headerStyle: { backgroundColor: '#111' }, headerTintColor: '#fff' }}>
      <Stack.Screen name="Home" component={HomeScreen} options={{ title: 'VEIL', headerShown: false }} />
      <Stack.Screen name="SettingsHub" component={SettingsHubScreen} options={{ title: 'Settings', headerShown: false }} />
      <Stack.Screen name="Profile" component={ProfileScreen} options={{ title: 'Edit Profile' }} />
      <Stack.Screen name="MfaSetup" component={MfaSetupScreen} options={{ title: 'MFA Settings' }} />
    </Stack.Navigator>
  );
};
