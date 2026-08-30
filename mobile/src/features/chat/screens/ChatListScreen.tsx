import React, { useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useChatStore } from '../store/useChatStore';
import { chatService } from '../services/chatService';
import { useAuth } from '../../auth/AuthContext';
import { Avatar } from '../../../components/Avatar';
import { formatDistanceToNow } from 'date-fns';
import { MessageSquare } from 'lucide-react-native';

export const ChatListScreen = () => {
  const navigation = useNavigation<any>();
  const { session } = useAuth();
  const { conversations, loadingConversations, startRealtime } = useChatStore();

  useEffect(() => {
    if (session?.user.id) {
      chatService.fetchConversations(session.user.id);
      startRealtime(session.user.id);
    }
  }, [session?.user.id]);

  const convArray = Object.values(conversations).sort((a, b) => 
    new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
  );

  const renderItem = ({ item }: { item: any }) => {
    const title = item.type === 'direct' ? (item.other_member?.display_name || 'Unknown') : 'Group Chat';
    const avatarPath = item.type === 'direct' ? item.other_member?.avatar_path : null;
    const timeText = item.updated_at ? formatDistanceToNow(new Date(item.updated_at), { addSuffix: true }) : '';

    return (
      <TouchableOpacity 
        style={styles.chatItem} 
        activeOpacity={0.7}
        onPress={() => navigation.navigate('ChatRoom', { conversationId: item.id, title })}
      >
        <Avatar path={avatarPath} size={56} fallbackText={title} />
        <View style={styles.textContainer}>
          <View style={styles.row}>
            <Text style={styles.title} numberOfLines={1}>{title}</Text>
            <Text style={styles.time}>{timeText}</Text>
          </View>
          <Text style={styles.subtitle} numberOfLines={1}>
            {item.last_message || 'No messages yet'}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  if (loadingConversations) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#10b981" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Messages</Text>
      </View>
      
      {convArray.length === 0 ? (
        <View style={styles.emptyContainer}>
          <MessageSquare color="#3f3f46" size={64} />
          <Text style={styles.emptyText}>No conversations yet.</Text>
          <Text style={styles.emptySubtext}>Sync your contacts to find friends.</Text>
        </View>
      ) : (
        <FlatList
          data={convArray}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#09090b' },
  centerContainer: { flex: 1, backgroundColor: '#09090b', justifyContent: 'center', alignItems: 'center' },
  header: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 10 },
  headerTitle: { color: '#fafafa', fontSize: 28, fontWeight: '800', letterSpacing: -0.5 },
  listContent: { paddingBottom: 20 },
  chatItem: { flexDirection: 'row', paddingVertical: 14, paddingHorizontal: 20, alignItems: 'center' },
  textContainer: { flex: 1, marginLeft: 16, justifyContent: 'center' },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  title: { color: '#fafafa', fontSize: 17, fontWeight: '600', flex: 1, marginRight: 10 },
  time: { color: '#71717a', fontSize: 12 },
  subtitle: { color: '#a1a1aa', fontSize: 14 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyText: { color: '#fafafa', fontSize: 18, fontWeight: '600', marginTop: 20 },
  emptySubtext: { color: '#a1a1aa', fontSize: 14, marginTop: 8, textAlign: 'center' }
});
