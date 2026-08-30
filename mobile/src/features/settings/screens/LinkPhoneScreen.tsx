import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { normalizePhoneNumber, hashPhoneNumber } from '../../contacts/services/discovery';
import { updateProfile } from '../services/profile';
import { useAuth } from '../../auth/AuthContext';
import { useNavigation } from '@react-navigation/native';

export const LinkPhoneScreen = () => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [regionCode, setRegionCode] = useState('US');
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const navigation = useNavigation();

  const handleLinkPhone = async () => {
    if (!user) return;
    setLoading(true);

    const normalized = normalizePhoneNumber(phoneNumber, regionCode);
    if (!normalized) {
      Alert.alert('Invalid Number', 'Please enter a valid phone number including country code if necessary.');
      setLoading(false);
      return;
    }

    try {
      const hash = hashPhoneNumber(normalized);
      await updateProfile(user.id, { phone_hash: hash });
      Alert.alert('Success', 'Your phone number has been linked securely. Friends can now discover you!', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to link phone number.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <Text style={styles.title}>Discoverability</Text>
      <Text style={styles.subtitle}>
        Link your phone number so friends who have you in their contacts can find you on VEIL. 
        Your raw phone number is never stored on our servers, only a cryptographic hash.
      </Text>

      <Text style={styles.label}>Region Code (e.g. US, GB, IN)</Text>
      <TextInput
        style={styles.input}
        value={regionCode}
        onChangeText={setRegionCode}
        autoCapitalize="characters"
        maxLength={2}
      />

      <Text style={styles.label}>Phone Number</Text>
      <TextInput
        style={styles.input}
        value={phoneNumber}
        onChangeText={setPhoneNumber}
        keyboardType="phone-pad"
        placeholder="(555) 555-5555"
        placeholderTextColor="#666"
      />

      <View style={styles.buttonContainer}>
        <Button title={loading ? "Linking..." : "Link Phone Number"} onPress={handleLinkPhone} disabled={loading} color="#4A90E2" />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000', padding: 20 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#fff', marginBottom: 10 },
  subtitle: { fontSize: 14, color: '#ccc', marginBottom: 30, lineHeight: 20 },
  label: { color: '#ccc', marginBottom: 8, fontSize: 16 },
  input: { backgroundColor: '#111', color: '#fff', padding: 15, borderRadius: 8, marginBottom: 20, borderWidth: 1, borderColor: '#333', fontSize: 16 },
  buttonContainer: { marginTop: 10 }
});
