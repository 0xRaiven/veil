import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../../services/supabase/client';

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

  const fetchMfaDetails = async (sess: Session | null) => {
    if (!sess) {
      setAal(null);
      setNextAal(null);
      setMfaFactors([]);
      return;
    }
    
    // Check current Authenticator Assurance Level
    const currentAal = sess.user.aud === 'authenticated' ? sess.user.app_metadata.aal || 'aal1' : null;
    
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

    const restoreSession = async () => {
      setIsLoading(true);
      const { data: { session: initialSession } } = await supabase.auth.getSession();
      if (mounted) {
        setSession(initialSession);
        setUser(initialSession?.user ?? null);
        await fetchMfaDetails(initialSession);
        setIsLoading(false);
      }
    };

    restoreSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, newSession) => {
        if (!mounted) return;
        setSession(newSession);
        setUser(newSession?.user ?? null);
        await fetchMfaDetails(newSession);
        setIsLoading(false);
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ session, user, aal, nextAal, isLoading, mfaFactors }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
