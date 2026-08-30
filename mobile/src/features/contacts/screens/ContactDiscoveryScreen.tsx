import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Share, Linking, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { discoverContacts, DiscoveredContact, UnmatchedContact } from '../services/discovery';
import { Avatar } from '../../../components/Avatar';

export const ContactDiscoveryScreen = () => {
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [matched, setMatched] = useState<DiscoveredContact[]>([]);
  const [unmatched, setUnmatched] = useState<UnmatchedContact[]>([]);

  useEffect(() => {
    loadContacts();
  }, []);

  const loadContacts = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const result = await discoverContacts();
      setMatched(result.matched);
      setUnmatched(result.unmatched);
    } catch (e: any) {
      if (e.message === 'Permission denied') {
        setErrorMsg('Contact permission is required to find your friends on VEIL. Please enable it in your device settings.');
      } else {
        setErrorMsg('Failed to process contacts. ' + e.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const inviteContact = async (phone: string) => {
    const message = "Join me on VEIL, a private messaging app.";
    if (Platform.OS === 'android') {
      Linking.openURL(`sms:${phone}?body=${encodeURIComponent(message)}`);
    } else {
      Linking.openURL(`sms:${phone}&body=${encodeURIComponent(message)}`);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#4A90E2" />
        <Text style={styles.loadingText}>Syncing securely...</Text>
      </SafeAreaView>
    );
  }

  if (errorMsg) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <Text style={styles.errorText}>{errorMsg}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={loadContacts}>
          <Text style={styles.retryBtnText}>Retry</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const renderMatched = ({ item }: { item: DiscoveredContact }) => (
    <TouchableOpacity style={styles.listItem} activeOpacity={0.7}>
      <Avatar path={item.avatar_path} size={52} fallbackText={item.display_name} />
      <View style={styles.listTextContainer}>
        <Text style={styles.listTitle}>{item.local_name}</Text>
        <Text style={styles.listSubtitle}>
          <Text style={styles.veilBadgeText}>● VEIL</Text> {item.display_name}
        </Text>
      </View>
      <TouchableOpacity style={styles.actionBtn}>
        <Text style={styles.actionBtnText}>Chat</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );

  const renderUnmatched = ({ item }: { item: UnmatchedContact }) => {
    const initial = item.local_name !== 'Unknown' ? item.local_name.charAt(0).toUpperCase() : '#';
    return (
      <View style={styles.listItem}>
        <View style={styles.fallbackAvatar}>
          <Text style={styles.fallbackAvatarText}>{initial}</Text>
        </View>
        <View style={styles.listTextContainer}>
          <Text style={styles.listTitle}>{item.local_name}</Text>
          <Text style={styles.listSubtitle}>{item.raw_number}</Text>
        </View>
        <TouchableOpacity style={styles.inviteBtn} onPress={() => inviteContact(item.raw_number)} activeOpacity={0.7}>
          <Text style={styles.inviteBtnText}>Invite</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <FlatList
        data={[
          { type: 'header', title: 'ON VEIL' },
          ...matched.map(m => ({ ...m, type: 'matched' })),
          { type: 'header', title: 'INVITE TO VEIL' },
          ...unmatched.map(u => ({ ...u, type: 'unmatched' }))
        ]}
        keyExtractor={(item, index) => item.type + index.toString()}
        renderItem={({ item }) => {
          if (item.type === 'header') return <Text style={styles.sectionHeader}>{(item as any).title}</Text>;
          if (item.type === 'matched') return renderMatched({ item } as any);
          if (item.type === 'unmatched') return renderUnmatched({ item } as any);
          return null;
        }}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#09090b' }, // deeper premium black
  centerContainer: { flex: 1, backgroundColor: '#09090b', justifyContent: 'center', alignItems: 'center', padding: 20 },
  loadingText: { color: '#a1a1aa', marginTop: 16, fontSize: 15, fontWeight: '500', letterSpacing: 0.5 },
  errorText: { color: '#ef4444', textAlign: 'center', marginBottom: 24, fontSize: 15, lineHeight: 22 },
  retryBtn: { backgroundColor: '#27272a', paddingVertical: 12, paddingHorizontal: 28, borderRadius: 20 },
  retryBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  sectionHeader: { color: '#71717a', fontSize: 12, fontWeight: '700', marginLeft: 20, marginTop: 30, marginBottom: 12, letterSpacing: 1.2 },
  listItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: '#18181b' },
  listTextContainer: { flex: 1, marginLeft: 16, justifyContent: 'center' },
  listTitle: { color: '#fafafa', fontSize: 16, fontWeight: '600', letterSpacing: 0.2, marginBottom: 4 },
  listSubtitle: { color: '#a1a1aa', fontSize: 13 },
  veilBadgeText: { color: '#10b981', fontWeight: '700', fontSize: 11, letterSpacing: 0.5 },
  actionBtn: { backgroundColor: 'rgba(59, 130, 246, 0.15)', paddingVertical: 8, paddingHorizontal: 20, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(59, 130, 246, 0.3)' },
  actionBtnText: { color: '#60a5fa', fontSize: 14, fontWeight: '700' },
  inviteBtn: { backgroundColor: '#18181b', paddingVertical: 8, paddingHorizontal: 20, borderRadius: 20, borderWidth: 1, borderColor: '#27272a' },
  inviteBtnText: { color: '#d4d4d8', fontSize: 14, fontWeight: '600' },
  fallbackAvatar: { width: 52, height: 52, borderRadius: 26, backgroundColor: '#18181b', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#27272a' },
  fallbackAvatarText: { color: '#71717a', fontSize: 20, fontWeight: '700' }
});
