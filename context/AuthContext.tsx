import React, { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface AuthContextType {
    user: User | null;
    role: string | null;
    permissions: any | null;
    session: Session | null;
    loading: boolean;
    signIn: (email: string, password: string) => Promise<{ error: any }>;
    signUp: (email: string, password: string, options?: any) => Promise<{ error: any }>;
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [role, setRole] = useState<string | null>(null);
    const [permissions, setPermissions] = useState<any | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [loading, setLoading] = useState(true);
    const currentUserRef = React.useRef<string | null>(null);

    // Safety Timeout for Global Loading (Prevent Splash Screen Freeze)
    useEffect(() => {
        if (!loading) return;

        const timeoutId = setTimeout(() => {
            console.warn('[AuthContext] ⚠️ LOADING TIMEOUT (5s)! Forcing loading = false. This prevents app from being stuck on splash screen.');
            setLoading(false);
        }, 5000);

        return () => clearTimeout(timeoutId);
    }, [loading]); // Only reset if loading state actually flips

    useEffect(() => {
        // Load role from storage initially
        const loadPersistedRole = async () => {
            try {
                const storedRole = await AsyncStorage.getItem('user_role');
                const storedPerms = await AsyncStorage.getItem('user_permissions');
                if (storedRole) {
                    console.log('[AuthContext] Loaded persisted role:', storedRole);
                    setRole(storedRole);
                }
                if (storedPerms) {
                    setPermissions(JSON.parse(storedPerms));
                }
            } catch (e) {
                console.error('[AuthContext] Failed to load role from storage', e);
            }
        };
        loadPersistedRole();

        console.log('[AuthContext] Initializing...');

        // Set up auth state listener
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, session) => {
                console.log('[AuthContext] Auth State Change:', event, session?.user?.id);

                if (event === 'SIGNED_OUT' || !session) {
                    console.log('[AuthContext] Processing Sign Out...');
                    setSession(null);
                    setUser(null);
                    setRole(null);
                    setPermissions(null);
                    currentUserRef.current = null;
                    setLoading(false);
                    // Clear persisted role & perms
                    AsyncStorage.removeItem('user_role');
                    AsyncStorage.removeItem('user_permissions');
                    return;
                }

                // If user changed (new login or session refresh), clear old state
                if (session.user.id !== currentUserRef.current) {
                    console.log('[AuthContext] User changed from', currentUserRef.current, 'to', session.user.id, '. Clearing stale state.');
                    setRole(null);
                    setPermissions(null);
                    currentUserRef.current = session.user.id;
                }

                setSession(session);
                setUser(session.user);

                // Fetch fresh role
                console.log('[AuthContext] Initiating role fetch for:', session.user.id);
                fetchUserRole(session.user.id);
            }
        );

        return () => subscription.unsubscribe();
    }, []);

    const fetchUserRole = async (userId: string) => {
        try {
            // We don't block loading UI on this fetch if we already have a role from storage.
            // But if we don't have a role, we might want to wait a bit.

            const { data, error } = await supabase
                .from('profiles')
                .select('role, permissions')
                .eq('id', userId)
                .single(); // single() is faster if we expect 1

            if (data && !error) {
                console.log('[AuthContext] Role fetched online:', data.role);
                setRole(data.role);
                setPermissions(data.permissions);
                // Save to storage
                AsyncStorage.setItem('user_role', data.role);
                if (data.permissions) {
                    AsyncStorage.setItem('user_permissions', JSON.stringify(data.permissions));
                }
            } else {
                console.warn('[AuthContext] Failed to fetch role online (Offline?):', error);
                // If we failed and have no role set yet (e.g. first login ever and offline immediately? unlikely)
                // We keep whatever is in 'role' state (from AsyncStorage).
            }
        } catch (e) {
            console.error('Role fetch exception', e);
        } finally {
            setLoading(false);
        }
    };

    const signIn = async (email: string, password: string) => {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        return { error };
    };

    const signUp = async (email: string, password: string, options?: any) => {
        const { error } = await supabase.auth.signUp({
            email,
            password,
            options
        });
        return { error };
    };

    const signOut = async () => {
        // Clear state immediately for better UI response
        setRole(null);
        setPermissions(null);
        setSession(null);
        setUser(null);
        AsyncStorage.removeItem('user_role');
        AsyncStorage.removeItem('user_permissions');
        await supabase.auth.signOut();
    };

    return (
        <AuthContext.Provider value={{ user, role, permissions, session, loading, signIn, signUp, signOut }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
