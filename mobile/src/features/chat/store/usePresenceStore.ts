import { create } from 'zustand';

interface PresenceState {
  onlineUsers: Record<string, boolean>; // Maps userId -> isOnline
  lastSeen: Record<string, string>;     // Maps userId -> iso timestamp
  typingUsers: Record<string, string>;  // Maps conversationId -> typing userId (for direct chat)
  
  setOnlineStatus: (userId: string, isOnline: boolean) => void;
  setLastSeen: (userId: string, timestamp: string) => void;
  setTypingStatus: (conversationId: string, userId: string | null) => void;
  bulkSetOnlineStatus: (users: { userId: string; isOnline: boolean }[]) => void;
}

export const usePresenceStore = create<PresenceState>((set) => ({
  onlineUsers: {},
  lastSeen: {},
  typingUsers: {},

  setOnlineStatus: (userId, isOnline) => set(state => ({
    onlineUsers: { ...state.onlineUsers, [userId]: isOnline }
  })),
  
  setLastSeen: (userId, timestamp) => set(state => ({
    lastSeen: { ...state.lastSeen, [userId]: timestamp }
  })),

  setTypingStatus: (conversationId, userId) => set(state => {
    const newTyping = { ...state.typingUsers };
    if (userId) {
      newTyping[conversationId] = userId;
    } else {
      delete newTyping[conversationId];
    }
    return { typingUsers: newTyping };
  }),

  bulkSetOnlineStatus: (users) => set(state => {
    const newOnline = { ...state.onlineUsers };
    users.forEach(u => {
      newOnline[u.userId] = u.isOnline;
    });
    return { onlineUsers: newOnline };
  }),
}));
