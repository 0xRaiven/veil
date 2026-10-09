import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Linking, Platform, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { discoverContacts, searchGlobalUsers, getSuggestedUsers, DiscoveredContact, UnmatchedContact } from '../services/discovery';
import { Avatar } from '../../../components/Avatar';
import { useAuth } from '../../auth/AuthContext';
import { Search } from 'lucide-react-native';
import { supabase } from '../../../services/supabase/client';

export const ContactDiscoveryScreen = () => {
  const navigation = useNavigation<any>();
  const { session } = useAuth();
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [matched, setMatched] = useState<DiscoveredContact[]>([]);
  const [unmatched, setUnmatched] = useState<UnmatchedContact[]>([]);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [globalUsers, setGlobalUsers] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'contacts' | 'global'>('contacts');

  const loadContacts = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const result = await discoverContacts(session?.user.id);
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
  }, [session?.user.id]);

  useEffect(() => {
    loadContacts();
  }, [loadContacts]);

  useEffect(() => {
    if (session?.user.id) {
      if (searchQuery.trim().length > 0) {
        searchGlobalUsers(searchQuery, session.user.id).then(setGlobalUsers);
      } else {
        getSuggestedUsers(session.user.id).then(setGlobalUsers);
      }
    }
  }, [searchQuery, session?.user.id]);

  const inviteContact = async (phone: string) => {
    const message = "Join me on VEIL, a private messaging app.";
    if (Platform.OS === 'android') {
      Linking.openURL(`sms:${phone}?body=${encodeURIComponent(message)}`);
    } else {
      Linking.openURL(`sms:${phone}&body=${encodeURIComponent(message)}`);
    }
  };

  const startChat = async (otherUserId: string, title: string) => {
    try {
      const isSelf = session?.user.id === otherUserId;
      const chatTitle = isSelf ? 'Note to Self (You)' : title;
      const { data, error } = await (supabase as any).rpc('create_direct_conversation', {
        other_user_id: otherUserId
      });
      if (!error && data) {
        navigation.navigate('ChatRoom', { conversationId: data, title: chatTitle });
      } else {
        console.error("Failed to start chat", error);
        Alert.alert('Chat Error', error?.message || 'Could not start conversation');
      }
    } catch (e: any) {
      console.error("Exception starting chat", e);
      Alert.alert('Chat Error', e.message);
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

  const renderMatched = ({ item }: { item: DiscoveredContact }) => {
    const isSelf = Boolean(item.is_self || (session?.user.id && item.id === session.user.id));
    const title = isSelf ? 'Note to Self (You)' : item.local_name;
    return (
      <TouchableOpacity
        style={[styles.listItem, isSelf && styles.selfListItem]}
        activeOpacity={0.7}
        onPress={() => startChat(item.id, title)}
      >
        <Avatar path={item.avatar_path} size={52} fallbackText={item.display_name} />
        <View style={styles.listTextContainer}>
          <View style={styles.titleRow}>
            <Text style={styles.listTitle} numberOfLines={1}>{item.local_name}</Text>
            {isSelf && (
              <View style={styles.selfBadge}>
                <Text style={styles.selfBadgeText}>THIS DEVICE</Text>
              </View>
            )}
          </View>
          <Text style={styles.listSubtitle}>
            <Text style={styles.veilBadgeText}>● VEIL</Text> {isSelf ? 'Message yourself (Notes & Sync)' : item.display_name}
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.actionBtn, isSelf && styles.selfActionBtn]}
          onPress={() => startChat(item.id, title)}
        >
          <Text style={[styles.actionBtnText, isSelf && styles.selfActionBtnText]}>
            {isSelf ? 'Notes' : 'Chat'}
          </Text>
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  const renderGlobalUser = ({ item }: { item: any }) => (
    <TouchableOpacity style={styles.listItem} activeOpacity={0.7} onPress={() => startChat(item.id, item.display_name)}>
      <Avatar path={item.avatar_path} size={52} fallbackText={item.display_name} />
      <View style={styles.listTextContainer}>
        <Text style={styles.listTitle}>{item.display_name}</Text>
        <Text style={styles.listSubtitle}>VEIL User</Text>
      </View>
      <TouchableOpacity style={styles.actionBtn} onPress={() => startChat(item.id, item.display_name)}>
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
      <View style={styles.tabContainer}>
        <TouchableOpacity style={[styles.tab, activeTab === 'contacts' && styles.activeTab]} onPress={() => setActiveTab('contacts')}>
          <Text style={[styles.tabText, activeTab === 'contacts' && styles.activeTabText]}>My Contacts</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, activeTab === 'global' && styles.activeTab]} onPress={() => setActiveTab('global')}>
          <Text style={[styles.tabText, activeTab === 'global' && styles.activeTabText]}>Discover Users</Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'global' && (
        <View style={styles.searchContainer}>
          <Search size={20} color="#71717a" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search VEIL users..."
            placeholderTextColor="#71717a"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      )}

      {activeTab === 'contacts' ? (
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
      ) : (
        <FlatList
          data={[
            { type: 'header', title: searchQuery.trim() ? 'SEARCH RESULTS' : 'SUGGESTED USERS' },
            ...globalUsers.map(u => ({ ...u, type: 'global' }))
          ]}
          keyExtractor={(item, index) => item.type + index.toString()}
          renderItem={({ item }) => {
            if (item.type === 'header') return <Text style={styles.sectionHeader}>{(item as any).title}</Text>;
            if (item.type === 'global') return renderGlobalUser({ item } as any);
            return null;
          }}
        />
      )}
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
  selfListItem: { backgroundColor: 'rgba(59, 130, 246, 0.05)' },
  listTextContainer: { flex: 1, marginLeft: 16, justifyContent: 'center' },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  listTitle: { color: '#fafafa', fontSize: 16, fontWeight: '600', letterSpacing: 0.2 },
  selfBadge: { backgroundColor: 'rgba(16, 185, 129, 0.15)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, borderWidth: 1, borderColor: 'rgba(16, 185, 129, 0.3)' },
  selfBadgeText: { color: '#10b981', fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
  listSubtitle: { color: '#a1a1aa', fontSize: 13 },
  veilBadgeText: { color: '#10b981', fontWeight: '700', fontSize: 11, letterSpacing: 0.5 },
  actionBtn: { backgroundColor: 'rgba(59, 130, 246, 0.15)', paddingVertical: 8, paddingHorizontal: 20, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(59, 130, 246, 0.3)' },
  actionBtnText: { color: '#60a5fa', fontSize: 14, fontWeight: '700' },
  selfActionBtn: { backgroundColor: 'rgba(16, 185, 129, 0.15)', borderColor: 'rgba(16, 185, 129, 0.3)' },
  selfActionBtnText: { color: '#10b981' },
  inviteBtn: { backgroundColor: '#18181b', paddingVertical: 8, paddingHorizontal: 20, borderRadius: 20, borderWidth: 1, borderColor: '#27272a' },
  inviteBtnText: { color: '#d4d4d8', fontSize: 14, fontWeight: '600' },
  fallbackAvatar: { width: 52, height: 52, borderRadius: 26, backgroundColor: '#18181b', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#27272a' },
  fallbackAvatarText: { color: '#71717a', fontSize: 20, fontWeight: '700' },
  tabContainer: { flexDirection: 'row', paddingHorizontal: 20, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#18181b' },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 20 },
  activeTab: { backgroundColor: '#18181b' },
  tabText: { color: '#71717a', fontSize: 14, fontWeight: '600' },
  activeTabText: { color: '#fafafa' },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#18181b', marginHorizontal: 20, marginTop: 16, marginBottom: 8, paddingHorizontal: 16, height: 44, borderRadius: 22, borderWidth: 1, borderColor: '#27272a' },
  searchInput: { flex: 1, color: '#fafafa', fontSize: 15, marginLeft: 10 }
});
