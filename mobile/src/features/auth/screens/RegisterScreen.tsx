import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert } from 'react-native';
import { supabase } from '../../../services/supabase/client';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';

export const RegisterScreen = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const navigation = useNavigation<NativeStackNavigationProp<any>>();

  const handleRegister = async () => {
    if (!email || !password || !displayName) {
      Alert.alert('Error', 'Please fill all fields.');
      return;
    }
    setLoading(true);
    
    // Register the user. Our database trigger handle_new_user() will catch the insertion
    // and atomically create the profiles row using the provided display_name.
    const { error } = await supabase.auth.signUp({ 
      email, 
      password,
      options: {
        data: { display_name: displayName }
      }
    });

    if (error) {
      Alert.alert('Registration Failed', error.message);
    } else {
      Alert.alert('Success', 'Account created successfully! Check email for verification if configured.', [
        { 
          text: 'OK', 
          onPress: () => {
            try {
              if (navigation.isFocused()) {
                navigation.navigate('Login');
              }
            } catch {
              // Ignore navigation errors if the auth navigator is already unmounted 
              // (which happens if Supabase automatically logs the user in upon registration)
            }
          }
        }
      ]);
    }
    setLoading(false);
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Join VEIL</Text>
      
      <TextInput
        style={styles.input}
        placeholder="Display Name"
        placeholderTextColor="#888"
        value={displayName}
        onChangeText={setDisplayName}
        autoCapitalize="words"
      />
      <TextInput
        style={styles.input}
        placeholder="Email"
        placeholderTextColor="#888"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        placeholderTextColor="#888"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      <View style={styles.buttonContainer}>
        <Button title={loading ? "Registering..." : "Register"} onPress={handleRegister} disabled={loading} color="#4A90E2" />
      </View>
      <View style={styles.buttonContainer}>
        <Button title="Back to Login" onPress={() => navigation.goBack()} disabled={loading} color="#999" />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 20, backgroundColor: '#000' },
  title: { fontSize: 24, fontWeight: 'bold', color: '#fff', marginBottom: 20, textAlign: 'center' },
  input: { backgroundColor: '#222', color: '#fff', padding: 15, borderRadius: 8, marginBottom: 15, borderWidth: 1, borderColor: '#333' },
  buttonContainer: { marginTop: 10 }
});
