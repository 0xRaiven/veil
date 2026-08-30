import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { enrollTOTP, verifyTOTP, unenrollTOTP } from '../services/mfa';
import { useAuth } from '../AuthContext';
import { SafeAreaView } from 'react-native-safe-area-context';
import QRCode from 'react-native-qrcode-svg';

export const MfaSetupScreen = () => {
  const { mfaFactors } = useAuth();
  const [factorId, setFactorId] = useState<string | null>(null);
  const [qrCodeData, setQrCodeData] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [initLoading, setInitLoading] = useState(false);

  const isEnrolled = mfaFactors.length > 0;

  useEffect(() => {
    if (!isEnrolled && !factorId) {
      startEnrollment();
    }
  }, [isEnrolled]);

  const startEnrollment = async () => {
    setInitLoading(true);
    try {
      const data = await enrollTOTP();
      setFactorId(data.id);
      // The payload contains totp.uri which can be rendered as a QR Code
      setQrCodeData(data.totp.uri);
    } catch (error: any) {
      Alert.alert('Enrollment Failed', error.message);
    } finally {
      setInitLoading(false);
    }
  };

  const handleVerifySetup = async () => {
    if (!code || !factorId) return;
    setLoading(true);
    try {
      await verifyTOTP(factorId, code);
      Alert.alert('Success', 'Two-Factor Authentication is now enabled.');
    } catch (error: any) {
      Alert.alert('Verification Failed', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDisableMFA = async () => {
    const factor = mfaFactors[0];
    if (!factor) return;
    Alert.alert(
      "Disable MFA",
      "Are you sure you want to disable Two-Factor Authentication?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Disable", 
          style: "destructive",
          onPress: async () => {
            setLoading(true);
            try {
              await unenrollTOTP(factor.id);
              Alert.alert('Success', 'MFA Disabled');
            } catch (error: any) {
              Alert.alert('Error', error.message);
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  if (isEnrolled) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.title}>Two-Factor Authentication</Text>
        <Text style={styles.subtitle}>You currently have MFA enabled to protect your account.</Text>
        <View style={styles.buttonContainer}>
          <Button title={loading ? "Disabling..." : "Disable MFA"} onPress={handleDisableMFA} color="#E24A4A" disabled={loading} />
        </View>
      </SafeAreaView>
    );
  }

  if (initLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color="#4A90E2" />
        <Text style={styles.subtitle}>Preparing MFA Setup...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Setup Two-Factor Authentication</Text>
      <Text style={styles.subtitle}>Scan the QR Code with Google Authenticator or Authy.</Text>
      
      {qrCodeData && (
        <View style={styles.qrContainer}>
          <QRCode value={qrCodeData} size={200} backgroundColor="#fff" color="#000" />
        </View>
      )}

      <TextInput
        style={styles.input}
        placeholder="Enter 6-digit code"
        placeholderTextColor="#555"
        value={code}
        onChangeText={setCode}
        keyboardType="number-pad"
        maxLength={6}
      />

      <View style={styles.buttonContainer}>
        <Button title={loading ? "Verifying..." : "Enable MFA"} onPress={handleVerifySetup} disabled={loading} color="#4A90E2" />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 20, backgroundColor: '#000' },
  title: { fontSize: 24, fontWeight: 'bold', color: '#fff', marginBottom: 10, textAlign: 'center' },
  subtitle: { fontSize: 16, color: '#ccc', marginBottom: 20, textAlign: 'center' },
  qrContainer: { alignItems: 'center', marginVertical: 30, padding: 20, backgroundColor: '#fff', alignSelf: 'center', borderRadius: 10 },
  input: { backgroundColor: '#222', color: '#fff', padding: 15, borderRadius: 8, marginBottom: 20, borderWidth: 1, borderColor: '#333', fontSize: 20, textAlign: 'center', letterSpacing: 3 },
  buttonContainer: { marginTop: 15 }
});
