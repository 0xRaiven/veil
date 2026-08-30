import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Switch } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { supabase } from '../../../services/supabase/client';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../auth/AuthContext';

export const SettingsHubScreen = () => {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const { session } = useAuth();
  const [pushEnabled, setPushEnabled] = useState(true);

  useEffect(() => {
    if (session?.user?.id) {
      supabase.from('profiles').select('push_enabled').eq('id', session.user.id).single()
        .then(({ data }) => {
          if (data && data.push_enabled !== null) {
            setPushEnabled(data.push_enabled);
          }
        });
    }
  }, [session]);

  const togglePush = async (val: boolean) => {
    setPushEnabled(val);
    if (session?.user?.id) {
      await supabase.from('profiles').update({ push_enabled: val }).eq('id', session.user.id);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const MenuItem = ({ title, onPress, icon, destructive = false }: { title: string, onPress: () => void, icon?: string, destructive?: boolean }) => (
    <TouchableOpacity style={styles.menuItem} onPress={onPress}>
      <Text style={[styles.menuItemText, destructive && { color: '#E24A4A' }]}>{title}</Text>
      <Text style={styles.menuItemArrow}>›</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Text style={styles.headerTitle}>Settings</Text>
      <ScrollView style={styles.scrollView}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ACCOUNT</Text>
          <MenuItem title="Profile" onPress={() => navigation.navigate('Profile')} />
          <MenuItem title="Discoverability (Phone)" onPress={() => navigation.navigate('LinkPhone')} />
          <MenuItem title="Security & MFA" onPress={() => navigation.navigate('MfaSetup')} />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>PREFERENCES</Text>
          <View style={styles.menuItem}>
            <Text style={styles.menuItemText}>Push Notifications</Text>
            <Switch value={pushEnabled} onValueChange={togglePush} />
          </View>
          <MenuItem title="Privacy" onPress={() => {}} />
          <MenuItem title="Appearance" onPress={() => {}} />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>SYSTEM</Text>
          <MenuItem title="Sign Out" onPress={handleLogout} destructive />
        </View>
        
        <Text style={styles.footerText}>Logged in as {session?.user.email}</Text>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  headerTitle: { fontSize: 28, fontWeight: 'bold', color: '#fff', marginHorizontal: 20, marginVertical: 20 },
  scrollView: { flex: 1 },
  section: { marginBottom: 30 },
  sectionTitle: { fontSize: 13, color: '#888', marginLeft: 20, marginBottom: 10, fontWeight: 'bold' },
  menuItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#111', padding: 16, borderBottomWidth: 1, borderBottomColor: '#222' },
  menuItemText: { color: '#fff', fontSize: 16 },
  menuItemArrow: { color: '#555', fontSize: 20 },
  footerText: { color: '#555', textAlign: 'center', marginTop: 20, fontSize: 12 }
});
