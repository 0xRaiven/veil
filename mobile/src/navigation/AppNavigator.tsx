import React from 'react';
import { View, Text, Button, StyleSheet } from 'react-native';
import { createNativeStackNavigator, NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { MfaSetupScreen } from '../features/auth/screens/MfaSetupScreen';
import { SettingsHubScreen } from '../features/settings/screens/SettingsHubScreen';
import { ProfileScreen } from '../features/settings/screens/ProfileScreen';
import { LinkPhoneScreen } from '../features/settings/screens/LinkPhoneScreen';
import { ContactDiscoveryScreen } from '../features/contacts/screens/ContactDiscoveryScreen';
import { ChatListScreen } from '../features/chat/screens/ChatListScreen';
import { ChatRoomScreen } from '../features/chat/screens/ChatRoomScreen';

// We will replace the placeholder HomeScreen entirely since the prompt asks for
// a Settings Hub as the foundation. We can use SettingsHub as the main view for now,
// or keep a blank Home and add a Settings button. Let's make Home just have a Settings button.
const HomeScreen = () => {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  return (
    <View style={styles.container}>
      <Text style={styles.title}>VEIL</Text>
      <Text style={styles.subtitle}>Stage 4 Contacts</Text>
      <View style={styles.buttonContainer}>
        <Button title="Messages" onPress={() => navigation.navigate('ChatList')} color="#10b981" />
      </View>
      <View style={styles.buttonContainer}>
        <Button title="Find Friends" onPress={() => navigation.navigate('ContactDiscovery')} color="#E2A14A" />
      </View>
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



const Stack = createNativeStackNavigator();

export const AppNavigator = () => {
  return (
    <Stack.Navigator screenOptions={{ headerStyle: { backgroundColor: '#111' }, headerTintColor: '#fff' }}>
      <Stack.Screen name="Home" component={HomeScreen} options={{ title: 'VEIL', headerShown: false }} />
      <Stack.Screen name="SettingsHub" component={SettingsHubScreen} options={{ title: 'Settings', headerShown: false }} />
      <Stack.Screen name="Profile" component={ProfileScreen} options={{ title: 'Edit Profile' }} />
      <Stack.Screen name="MfaSetup" component={MfaSetupScreen} options={{ title: 'MFA Settings' }} />
      <Stack.Screen name="LinkPhone" component={LinkPhoneScreen} options={{ title: 'Link Phone' }} />
      <Stack.Screen name="ContactDiscovery" component={ContactDiscoveryScreen} options={{ title: 'Find Friends' }} />
      <Stack.Screen name="ChatList" component={ChatListScreen} options={{ title: 'Messages', headerShown: false }} />
      <Stack.Screen name="ChatRoom" component={ChatRoomScreen} options={{ headerStyle: { backgroundColor: '#09090b' } }} />
    </Stack.Navigator>
  );
};
