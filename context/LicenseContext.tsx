import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import * as Linking from 'expo-linking';

interface LicenseStatus {
    isActivated: boolean;
    isTrial: boolean;
    daysLeft: number;
    deviceId: string;
    loading: boolean;
}

interface LicenseContextType extends LicenseStatus {
    activate: (serial: string) => Promise<{ success: boolean; message: string }>;
    refreshStatus: () => Promise<void>;
}

const LicenseContext = createContext<LicenseContextType | undefined>(undefined);

export function LicenseProvider({ children }: { children: ReactNode }) {
    const [status, setStatus] = useState<LicenseStatus>({
        isActivated: false,
        isTrial: true,
        daysLeft: 7,
        deviceId: '',
        loading: true
    });

    useEffect(() => {
        initializeLicense();
    }, []);

    const getDeviceId = async () => {
        let id = await AsyncStorage.getItem('app_device_id');
        if (!id) {
            // Generate a simple unique ID if not exists
            id = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
            await AsyncStorage.setItem('app_device_id', id);
        }
        return id;
    };

    const initializeLicense = async () => {
        try {
            const deviceId = await getDeviceId();

            // 1. Check database for existing activation
            const { data, error } = await supabase
                .from('device_activations')
                .select('*')
                .eq('device_id', deviceId)
                .single();

            if (error && error.code !== 'PGRST116') {
                console.error('[License] Error fetching activation:', error);
            }

            if (data) {
                // Device found in database
                if (data.license_id) {
                    // Fully activated
                    setStatus({
                        isActivated: true,
                        isTrial: false,
                        daysLeft: 999,
                        deviceId,
                        loading: false
                    });
                } else {
                    // In trial mode (recorded in DB)
                    const start = new Date(data.trial_started_at);
                    const now = new Date();
                    const diffTime = Math.abs(now.getTime() - start.getTime());
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                    const remaining = Math.max(0, 7 - diffDays);

                    setStatus({
                        isActivated: false,
                        isTrial: remaining > 0,
                        daysLeft: remaining,
                        deviceId,
                        loading: false
                    });

                    // Update local storage for offline speed
                    await AsyncStorage.setItem('license_cache', JSON.stringify({
                        isActivated: false,
                        daysLeft: remaining
                    }));
                }
            } else {
                // New Device: Register trial in DB
                const { data: newData, error: insertError } = await supabase
                    .from('device_activations')
                    .insert([{ device_id: deviceId }])
                    .select()
                    .single();

                if (insertError) {
                    console.error('[License] Failed to register trial:', insertError);
                    // Fallback to local only if offline
                }

                setStatus({
                    isActivated: false,
                    isTrial: true,
                    daysLeft: 7,
                    deviceId,
                    loading: false
                });
            }
        } catch (e) {
            console.error('[License] Initialization failed:', e);
            // Fallback to cached data if exists
            const cached = await AsyncStorage.getItem('license_cache');
            if (cached) {
                const parsed = JSON.parse(cached);
                setStatus(prev => ({ ...prev, ...parsed, loading: false }));
            } else {
                setStatus(prev => ({ ...prev, loading: false }));
            }
        }
    };

    const activate = async (serial: string): Promise<{ success: boolean; message: string }> => {
        try {
            // 1. Find license
            const { data: license, error: lError } = await supabase
                .from('licenses')
                .select('*')
                .eq('serial_number', serial)
                .eq('is_used', false)
                .single();

            if (lError || !license) {
                return { success: false, message: 'Serial number tidak valid atau sudah digunakan.' };
            }

            const deviceId = await getDeviceId();

            // 2. Update device_activations
            const { error: aError } = await supabase
                .from('device_activations')
                .update({
                    license_id: license.id,
                    is_trial_active: false
                })
                .eq('device_id', deviceId);

            if (aError) throw aError;

            // 3. Mark license as used
            await supabase
                .from('licenses')
                .update({ is_used: true })
                .eq('id', license.id);

            // 4. Update local state
            setStatus(prev => ({
                ...prev,
                isActivated: true,
                isTrial: false,
                daysLeft: 999
            }));

            // Sync cache
            await AsyncStorage.setItem('license_cache', JSON.stringify({
                isActivated: true,
                daysLeft: 999
            }));

            return { success: true, message: 'Aktivasi berhasil! Aplikasi sekarang versi penuh.' };

        } catch (error: any) {
            console.error('[License] Activation error:', error);
            return { success: false, message: error.message || 'Terjadi kesalahan saat aktivasi.' };
        }
    };

    const refreshStatus = async () => {
        setStatus(prev => ({ ...prev, loading: true }));
        await initializeLicense();
    };

    return (
        <LicenseContext.Provider value={{ ...status, activate, refreshStatus }}>
            {children}
        </LicenseContext.Provider>
    );
}

export function useLicense() {
    const context = useContext(LicenseContext);
    if (context === undefined) {
        throw new Error('useLicense must be used within a LicenseProvider');
    }
    return context;
}
