import React from 'react';
import { View, Text, Button, StyleSheet } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { supabase } from '../services/supabase/client';
import { MfaSetupScreen } from '../features/auth/screens/MfaSetupScreen';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

// Placeholder Home Screen for now
const HomeScreen = () => {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  return (
    <View style={styles.container}>
      <Text style={styles.title}>VEIL Home</Text>
      <Text style={styles.subtitle}>You are securely authenticated.</Text>
      <View style={styles.buttonContainer}>
        <Button title="Manage MFA" onPress={() => navigation.navigate('MfaSetup')} color="#4A90E2" />
      </View>
      <View style={styles.buttonContainer}>
        <Button title="Logout" onPress={() => supabase.auth.signOut()} color="#E24A4A" />
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

const Stack = createNativeStackNavigator();

export const AppNavigator = () => {
  return (
    <Stack.Navigator screenOptions={{ headerStyle: { backgroundColor: '#111' }, headerTintColor: '#fff' }}>
      <Stack.Screen name="Home" component={HomeScreen} options={{ title: 'VEIL' }} />
      <Stack.Screen name="MfaSetup" component={MfaSetupScreen} options={{ title: 'MFA Settings' }} />
    </Stack.Navigator>
  );
};
