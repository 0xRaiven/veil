import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert } from 'react-native';
import { challengeTOTP } from '../services/mfa';
import { useAuth } from '../AuthContext';
import { supabase } from '../../../services/supabase/client';
import { SafeAreaView } from 'react-native-safe-area-context';

export const MfaChallengeScreen = () => {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const { mfaFactors } = useAuth();

  const handleVerify = async () => {
    if (!code || code.length < 6) {
      Alert.alert('Error', 'Please enter a valid 6-digit code.');
      return;
    }
    
    // Grab the first verified TOTP factor (we only support one currently)
    const totpFactor = mfaFactors[0];
    if (!totpFactor) {
      Alert.alert('Error', 'No verified MFA factor found.');
      return;
    }

    setLoading(true);
    try {
      await challengeTOTP(totpFactor.id, code);
      // Supabase's onAuthStateChange will catch the new token with AAL2 and update context
    } catch (error: any) {
      Alert.alert('Verification Failed', error.message || 'Invalid code');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Two-Factor Authentication</Text>
      <Text style={styles.subtitle}>Enter the 6-digit code from your authenticator app to continue.</Text>
      
      <TextInput
        style={styles.input}
        placeholder="000000"
        placeholderTextColor="#555"
        value={code}
        onChangeText={setCode}
        keyboardType="number-pad"
        maxLength={6}
      />

      <View style={styles.buttonContainer}>
        <Button title={loading ? "Verifying..." : "Verify Code"} onPress={handleVerify} disabled={loading} color="#4A90E2" />
      </View>
      <View style={styles.buttonContainer}>
        <Button title="Cancel & Logout" onPress={handleLogout} color="#E24A4A" />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 20, backgroundColor: '#000' },
  title: { fontSize: 24, fontWeight: 'bold', color: '#fff', marginBottom: 10, textAlign: 'center' },
  subtitle: { fontSize: 16, color: '#ccc', marginBottom: 30, textAlign: 'center' },
  input: { backgroundColor: '#222', color: '#fff', padding: 15, borderRadius: 8, marginBottom: 25, borderWidth: 1, borderColor: '#333', fontSize: 24, textAlign: 'center', letterSpacing: 5 },
  buttonContainer: { marginTop: 15 }
});
