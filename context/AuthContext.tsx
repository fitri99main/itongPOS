import React, { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface AuthContextType {
    user: User | null;
    role: string | null;
    permissions: any | null;
    profile: any | null;
    session: Session | null;
    deviceId: string | null; // Added
    isSessionHijacked: boolean; // Added
    clearSessionHijack: () => void; // Added
    loading: boolean;
    signIn: (email: string, password: string) => Promise<{ error: any }>;
    signUp: (email: string, password: string, options?: any) => Promise<{ error: any }>;
    signOut: () => Promise<void>;
    clearStoredSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [role, setRole] = useState<string | null>(null);
    const [permissions, setPermissions] = useState<any | null>(null);
    const [profile, setProfile] = useState<any | null>(null); // Added
    const [session, setSession] = useState<Session | null>(null);
    const [deviceId, setDeviceId] = useState<string | null>(null); // Added
    const [isSessionHijacked, setIsSessionHijacked] = useState(false); // Added
    const [loading, setLoading] = useState(true);
    const currentUserRef = React.useRef<string | null>(null);
    const isSigningInRef = React.useRef(false); // Added to track active sign-in process

    // Safety Timeout for Global Loading
    useEffect(() => {
        if (!loading) return;
        const timeoutId = setTimeout(() => {
            console.log('[AuthContext] ⚠️ LOADING TIMEOUT (5s)! Forcing loading = false.');
            setLoading(false);
        }, 5000);
        return () => clearTimeout(timeoutId);
    }, [loading]);

    // Initialize or load Device ID
    const initDeviceId = async () => {
        try {
            let id = await AsyncStorage.getItem('app_device_id');
            if (!id) {
                id = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
                await AsyncStorage.setItem('app_device_id', id);
            }
            setDeviceId(id);
            return id;
        } catch (e) {
            console.error('[AuthContext] Error init DeviceID', e);
            return null;
        }
    };

    useEffect(() => {
        initDeviceId();

        // Load role/profile from storage initially
        const loadPersistedData = async () => {
            try {
                const storedRole = await AsyncStorage.getItem('user_role');
                const storedPerms = await AsyncStorage.getItem('user_permissions');
                const storedProfile = await AsyncStorage.getItem('user_profile');

                if (storedRole) setRole(storedRole);
                if (storedPerms) setPermissions(JSON.parse(storedPerms));
                if (storedProfile) setProfile(JSON.parse(storedProfile));
            } catch (e) {
                console.error('[AuthContext] Failed to load data from storage', e);
            }
        };
        loadPersistedData();

        console.log('[AuthContext] Initializing...');

        // Set up auth state listener
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, session) => {
                console.log('[AuthContext] Auth State Change:', event, session?.user?.id);

                if (event === 'TOKEN_REFRESHED') {
                    console.log('[AuthContext] Token refreshed successfully');
                }

                if (event === 'SIGNED_OUT' || !session) {
                    console.log('[AuthContext] Processing Sign Out...');
                    setSession(null);
                    setUser(null);
                    setRole(null);
                    setPermissions(null);
                    setProfile(null);
                    currentUserRef.current = null;
                    setLoading(false);

                    await AsyncStorage.removeItem('user_role');
                    await AsyncStorage.removeItem('user_permissions');
                    await AsyncStorage.removeItem('user_profile');
                    return;
                }

                if (session.user.id !== currentUserRef.current) {
                    console.log('[AuthContext] User changed. Clearing stale state.');
                    setRole(null);
                    setPermissions(null);
                    setProfile(null);
                    currentUserRef.current = session.user.id;
                    setIsSessionHijacked(false); // Reset on new user
                }

                setSession(session);
                setUser(session.user);

                // Fetch fresh profile & Setup Realtime Sync
                fetchUserProfile(session.user.id);
            }
        );

        return () => subscription.unsubscribe();
    }, []);

    // Realtime Listener for Session Enforcement
    useEffect(() => {
        if (!user || !deviceId) return;

        console.log('[AuthContext] 📡 Setting up Realtime Session Listener for:', user.id);

        const channel = supabase
            .channel(`profile_session_${user.id}`)
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'profiles',
                    filter: `id=eq.${user.id}`,
                },
                (payload) => {
                    const newDeviceId = payload.new.last_device_id;
                    console.log('[AuthContext] 🔄 Profile Update Received. DeviceID in DB:', newDeviceId, 'Local:', deviceId);

                    // Only trigger hijack if we're not currently in the process of signing in
                    if (!isSigningInRef.current && newDeviceId && newDeviceId !== deviceId) {
                        console.warn('[AuthContext] ⚠️ SESSION HIJACKED! Different device ID detected.');
                        setIsSessionHijacked(true);
                    }
                }
            )
            .subscribe((status) => {
                console.log(`[AuthContext] 📡 Realtime Subscription Status for ${user?.id}:`, status);
            });

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user, deviceId]);

    const fetchUserProfile = async (userId: string) => {
        try {
            console.log('[AuthContext] 🔍 Fetching profile for:', userId);
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .single();

            if (data && !error) {
                console.log('[AuthContext] ✅ Profile fetched. DB DeviceID:', data.last_device_id);

                const currentStoredDeviceId = await AsyncStorage.getItem('app_device_id');
                console.log('[AuthContext] 📱 Local DeviceID:', currentStoredDeviceId);

                // 1. Initial Claim: If DB is empty, or if we just signed in (covered by signIn method usually)
                // But let's be safe: if DB is empty, claim it now.
                if (!data.last_device_id && currentStoredDeviceId) {
                    console.log('[AuthContext] 🆕 DB last_device_id is empty. Claiming for this device...');
                    await updateLastDeviceId(userId);
                    data.last_device_id = currentStoredDeviceId; // Update local data to avoid hijack trigger below
                }

                // 2. Enforce Mismatch Check
                // Note: Skip if currently signing in, as DB may contain old ID until signIn update finishes
                if (!isSigningInRef.current && data.last_device_id && currentStoredDeviceId && data.last_device_id !== currentStoredDeviceId) {
                    console.warn('[AuthContext] ⚠️ MISMATCH DETECTED! DB:', data.last_device_id, 'Local:', currentStoredDeviceId);
                    setIsSessionHijacked(true);
                }

                setRole(data.role);
                setPermissions(data.permissions);
                setProfile(data);

                AsyncStorage.setItem('user_role', data.role);
                AsyncStorage.setItem('user_profile', JSON.stringify(data));
                if (data.permissions) {
                    AsyncStorage.setItem('user_permissions', JSON.stringify(data.permissions));
                }
            } else {
                console.warn('[AuthContext] ❌ Failed to fetch profile:', error);
            }
        } catch (e) {
            console.error('[AuthContext] 💥 Profile fetch exception', e);
        } finally {
            setLoading(false);
        }
    };

    const updateLastDeviceId = async (userId: string) => {
        try {
            const currentStoredDeviceId = await AsyncStorage.getItem('app_device_id');
            if (currentStoredDeviceId) {
                console.log('[AuthContext] Updating last_device_id to:', currentStoredDeviceId);
                await supabase
                    .from('profiles')
                    .update({ last_device_id: currentStoredDeviceId })
                    .eq('id', userId);
            }
        } catch (error) {
            console.error('[AuthContext] Error updating last device id:', error);
        }
    };

    const signIn = async (identifier: string, password: string) => {
        isSigningInRef.current = true; // Mark that we are starting sign-in
        try {
            let email = identifier;
            if (!identifier.includes('@')) {
                const { data } = await supabase
                    .from('profiles')
                    .select('email')
                    .or(`username.eq."${identifier}",full_name.eq."${identifier}"`)
                    .maybeSingle();
                if (data?.email) email = data.email;
            }

            const { data: authData, error } = await supabase.auth.signInWithPassword({ email, password });

            if (!error && authData?.user) {
                // Update last_device_id on successful sign in
                await updateLastDeviceId(authData.user.id);
            }

            if (error && error.message?.includes('refresh')) {
                await signOut();
                const { error: retryError } = await supabase.auth.signInWithPassword({ email, password });
                return { error: retryError };
            }

            return { error };
        } finally {
            // Ensure we clear the flag after everything (including state listeners) had time to settle
            setTimeout(() => {
                isSigningInRef.current = false;
            }, 2000);
        }
    };

    const signUp = async (email: string, password: string, options?: any) => {
        const { error } = await supabase.auth.signUp({ email, password, options });
        return { error };
    };

    const signOut = async () => {
        setRole(null);
        setPermissions(null);
        setProfile(null);
        setSession(null);
        setUser(null);
        setIsSessionHijacked(false); // Clear hijack state on logout
        await AsyncStorage.removeItem('user_role');
        await AsyncStorage.removeItem('user_permissions');
        await AsyncStorage.removeItem('user_profile');
        await supabase.auth.signOut();
    };

    const clearStoredSession = async () => {
        await signOut();
    };

    const clearSessionHijack = () => {
        setIsSessionHijacked(false);
    };

    const contextValue = {
        user,
        role,
        permissions,
        profile,
        session,
        deviceId,
        isSessionHijacked,
        clearSessionHijack,
        loading,
        signIn,
        signUp,
        signOut,
        clearStoredSession
    };

    return (
        <AuthContext.Provider value={contextValue}>
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
