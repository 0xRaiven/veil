import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useChatStore, Message } from '../store/useChatStore';
import { usePresenceStore } from '../store/usePresenceStore';
import { chatService } from '../services/chatService';
import { typingService } from '../services/typingService';
import { useAuth } from '../../auth/AuthContext';
import { Send, Clock, Check, CheckCheck, AlertCircle } from 'lucide-react-native';
import { formatDistanceToNow } from 'date-fns';
import { Avatar } from '../../../components/Avatar';

const EMPTY_ARRAY: Message[] = [];

export const ChatRoomScreen = () => {
  const route = useRoute<any>();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { session } = useAuth();
  
  const conversationId = route.params?.conversationId;
  const title = route.params?.title || 'Chat';
  
  const conversation = useChatStore(state => state.conversations[conversationId]);
  const otherMember = conversation?.other_member;
  
  const messages = useChatStore(state => state.messages[conversationId] || EMPTY_ARRAY);
  const isOnline = usePresenceStore(state => otherMember ? state.onlineUsers[otherMember.id] : false);
  const lastSeen = usePresenceStore(state => otherMember ? state.lastSeen[otherMember.id] : null);
  const typingUserId = usePresenceStore(state => state.typingUsers[conversationId]);
  const isTyping = typingUserId && otherMember && typingUserId === otherMember.id;
  
  const [loading, setLoading] = useState(true);
  const [inputText, setInputText] = useState('');
  const lastTypingTime = React.useRef(0);
  const [ticker, setTicker] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setTicker(t => t + 1), 30000); // Update every 30s
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    let statusText = '';
    let statusColor = '#10b981'; // Green by default
    const isSelf = otherMember?.is_self;
    
    if (isSelf) {
      statusText = 'This Device • Saved messages';
      statusColor = '#10b981';
    } else if (isTyping) {
      statusText = 'Typing...';
    } else if (isOnline) {
      statusText = 'Online';
    } else if (lastSeen) {
      statusText = 'Last seen ' + formatDistanceToNow(new Date(lastSeen), { addSuffix: true });
      statusColor = '#71717a'; // Gray for offline
    } else if (otherMember?.last_seen) {
      statusText = 'Last seen ' + formatDistanceToNow(new Date(otherMember.last_seen), { addSuffix: true });
      statusColor = '#71717a';
    }
    
    const displayTitle = isSelf ? 'Note to Self (You)' : title;
    const remoteAvatarPath = otherMember?.avatar_path || null;
    const localAvatarPath = otherMember?.local_avatar_path || null;
    const finalAvatarPath = localAvatarPath || remoteAvatarPath;

    navigation.setOptions({ 
      // eslint-disable-next-line react/no-unstable-nested-components
      headerTitle: () => (
        <View style={styles.headerContainer}>
          <View style={styles.headerAvatarWrapper}>
            <Avatar path={finalAvatarPath} size={36} fallbackText={isSelf ? 'You' : displayTitle} />
          </View>
          <View>
            <Text style={styles.headerTitleText}>{displayTitle}</Text>
            {statusText ? <Text style={[styles.headerStatusText, { color: statusColor }]}>{statusText}</Text> : null}
          </View>
        </View>
      )
    });
  }, [title, isOnline, isTyping, lastSeen, otherMember?.last_seen, otherMember?.avatar_path, otherMember?.local_avatar_path, otherMember?.is_self, navigation, ticker]);

  useEffect(() => {
    if (conversationId && session?.user.id) {
      chatService.fetchMessages(conversationId).then(() => setLoading(false));
      typingService.joinRoom(conversationId, session.user.id);
    }
    return () => {
      if (conversationId) typingService.leaveRoom(conversationId);
    };
  }, [conversationId, session?.user.id]);

  useEffect(() => {
    if (conversationId && session?.user.id) {
      chatService.markAsRead(conversationId, session.user.id);
    }
  }, [conversationId, messages.length, session?.user.id]);

  const handleTextChange = (text: string) => {
    setInputText(text);
    if (!session?.user.id || !conversationId) return;

    const now = Date.now();
    if (now - lastTypingTime.current > 2000) {
      typingService.sendTypingEvent(conversationId, session.user.id, true);
      lastTypingTime.current = now;
    }
    
    if (text === '') {
      typingService.sendTypingEvent(conversationId, session.user.id, false);
      lastTypingTime.current = 0;
    }
  };

  const handleSend = () => {
    const text = inputText.trim();
    if (!text || !session?.user.id) return;
    setInputText('');
    typingService.sendTypingEvent(conversationId, session.user.id, false);
    chatService.sendMessage(conversationId, session.user.id, text);
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isMe = item.sender_id === session?.user.id;
    
    // Check if the other person has read this message
    const isRead = otherMember?.last_read_at && 
                   new Date(item.created_at) <= new Date(otherMember.last_read_at);

    return (
      <View style={[styles.messageWrapper, isMe ? styles.messageWrapperMe : styles.messageWrapperThem]}>
        <View style={[styles.messageBubble, isMe ? styles.messageBubbleMe : styles.messageBubbleThem]}>
          <Text style={[styles.messageText, isMe ? styles.messageTextMe : styles.messageTextThem]}>
            {item.content_type === 'plaintext' ? item.content : '🔒 Encrypted Message'}
          </Text>
          <View style={styles.messageFooter}>
            <Text style={[styles.timeText, isMe ? styles.timeTextMe : styles.timeTextThem]}>
              {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
            {isMe && (
              <View style={styles.statusIcon}>
                {item.status === 'sending' && <Clock size={12} color="rgba(255,255,255,0.7)" />}
                {item.status === 'sent' && !isRead && <Check size={14} color="rgba(255,255,255,0.7)" />}
                {item.status === 'sent' && isRead && <CheckCheck size={14} color="#3b82f6" />}
                {item.status === 'error' && <AlertCircle size={12} color="#ef4444" />}
              </View>
            )}
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <KeyboardAvoidingView 
        style={styles.flexOne}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {loading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color="#10b981" />
          </View>
        ) : (
          <FlatList
            inverted
            data={messages}
            keyExtractor={item => item.id}
            renderItem={renderMessage}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
        )}
        
        <View style={[styles.composerContainer, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.input}
              placeholder="Message..."
              placeholderTextColor="#71717a"
              value={inputText}
              onChangeText={handleTextChange}
              multiline
              maxLength={2000}
            />
            <TouchableOpacity 
              style={[styles.sendBtn, !inputText.trim() && styles.sendBtnDisabled]}
              disabled={!inputText.trim()}
              onPress={handleSend}
            >
              <Send size={18} color={inputText.trim() ? '#fff' : '#52525b'} />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#09090b' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContent: { paddingHorizontal: 16, paddingVertical: 20 },
  messageWrapper: { width: '100%', marginBottom: 12, flexDirection: 'row' },
  messageWrapperMe: { justifyContent: 'flex-end' },
  messageWrapperThem: { justifyContent: 'flex-start' },
  messageBubble: { maxWidth: '80%', padding: 12, borderRadius: 20 },
  messageBubbleMe: { backgroundColor: '#10b981', borderBottomRightRadius: 4 },
  messageBubbleThem: { backgroundColor: '#27272a', borderBottomLeftRadius: 4 },
  messageText: { fontSize: 16, lineHeight: 22 },
  messageTextMe: { color: '#fff' },
  messageTextThem: { color: '#fafafa' },
  messageFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', marginTop: 4 },
  timeText: { fontSize: 11 },
  timeTextMe: { color: 'rgba(255,255,255,0.7)' },
  timeTextThem: { color: '#a1a1aa' },
  statusIcon: { marginLeft: 4 },
  flexOne: { flex: 1 },
  headerContainer: { flexDirection: 'row', alignItems: 'center' },
  headerAvatarWrapper: { marginRight: 10 },
  headerTitleText: { color: '#fafafa', fontSize: 16, fontWeight: '600' },
  headerStatusText: { fontSize: 12 },
  composerContainer: { backgroundColor: '#09090b', borderTopWidth: 1, borderTopColor: '#18181b', paddingHorizontal: 16, paddingTop: 12 },
  inputWrapper: { flexDirection: 'row', alignItems: 'flex-end', backgroundColor: '#18181b', borderRadius: 24, paddingHorizontal: 16, paddingVertical: 8, borderWidth: 1, borderColor: '#27272a' },
  input: { flex: 1, color: '#fafafa', fontSize: 16, maxHeight: 100, minHeight: 24, paddingVertical: 4 },
  sendBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#10b981', justifyContent: 'center', alignItems: 'center', marginLeft: 12, marginBottom: 2 },
  sendBtnDisabled: { backgroundColor: '#27272a' }
});
