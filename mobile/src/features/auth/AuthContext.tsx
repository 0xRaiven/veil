import React, { createContext, useContext, useEffect, useState, useRef, ReactNode } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../../services/supabase/client';
import { presenceService } from '../chat/services/presenceService';
import { initDatabase } from '../../services/databaseService';
import { chatService } from '../chat/services/chatService';
import { notificationService } from '../../services/notificationService';
import NetInfo from '@react-native-community/netinfo';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  aal: 'aal1' | 'aal2' | null;
  nextAal: 'aal1' | 'aal2' | null;
  isLoading: boolean;
  mfaFactors: any[];
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  aal: null,
  nextAal: null,
  isLoading: true,
  mfaFactors: [],
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [aal, setAal] = useState<'aal1' | 'aal2' | null>(null);
  const [nextAal, setNextAal] = useState<'aal1' | 'aal2' | null>(null);
  const [mfaFactors, setMfaFactors] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const sessionRef = useRef<Session | null>(null);
  sessionRef.current = session;

  const fetchMfaDetails = async (sess: Session | null) => {
    if (!sess) {
      setAal(null);
      setNextAal(null);
      setMfaFactors([]);
      return;
    }
    
    try {
      // Determine what AAL we *could* have based on enrolled factors
      const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (!error && data) {
        setAal(data.currentLevel as 'aal1' | 'aal2' | null);
        setNextAal(data.nextLevel as 'aal1' | 'aal2' | null);
      }
      
      const factorsData = await supabase.auth.mfa.listFactors();
      if (!factorsData.error) {
        setMfaFactors(factorsData.data.totp.filter((f) => f.status === 'verified'));
      }
    } catch (e) {
      console.warn('Error fetching MFA details:', e);
    }
  };

  useEffect(() => {
    let mounted = true;
    initDatabase();

    let unsubscribeMessages: (() => void) | null = null;

    const restoreSession = async () => {
      setIsLoading(true);
      const { data: { session: initialSession } } = await supabase.auth.getSession();
      if (mounted) {
        setSession(initialSession);
        setUser(initialSession?.user ?? null);
        if (initialSession?.user) {
          presenceService.init(initialSession.user.id);
          // syncService.init(initialSession.user.id);
          // syncService.performSync();
          chatService.fetchConversations(initialSession.user.id);
          unsubscribeMessages = chatService.subscribeToMessages(initialSession.user.id);
          notificationService.syncToken(initialSession.user.id);
        }
        await fetchMfaDetails(initialSession);
        setIsLoading(false);
      }
    };

    restoreSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        if (!mounted) return;
        
        if (event === 'SIGNED_OUT') {
          if (sessionRef.current?.user?.id) {
             notificationService.removeToken(sessionRef.current.user.id);
          }
          presenceService.cleanup();
          if (unsubscribeMessages) unsubscribeMessages();
        } else if (newSession?.user) {
          presenceService.init(newSession.user.id);
          // syncService.init(newSession.user.id);
          // syncService.performSync();
          chatService.fetchConversations(newSession.user.id);
          if (unsubscribeMessages) unsubscribeMessages();
          unsubscribeMessages = chatService.subscribeToMessages(newSession.user.id);
          notificationService.syncToken(newSession.user.id);
        }
        
        setSession(newSession);
        setUser(newSession?.user ?? null);
        await fetchMfaDetails(newSession);
        setIsLoading(false);
      }
    );

    const unsubscribeNet = NetInfo.addEventListener(state => {
      const currentSess = sessionRef.current;
      if (state.isConnected && currentSess?.user) {
        console.log('[AuthContext] Network restored, fetching conversations');
        // syncService.performSync();
        // outboxService.process();
        chatService.fetchConversations(currentSess.user.id);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
      unsubscribeNet();
      presenceService.cleanup();
      if (unsubscribeMessages) unsubscribeMessages();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ session, user, aal, nextAal, isLoading, mfaFactors }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
