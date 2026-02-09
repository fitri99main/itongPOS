import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface CashRegister {
    id: string;
    user_id: string;
    branch_id: string | null;
    opening_time: string;
    closing_time: string | null;
    opening_balance: number;
    closing_balance: number | null;
    total_sales: number;
    expected_balance: number;
    actual_balance: number | null;
    difference: number | null;
    status: 'open' | 'closed';
    notes: string | null;
}

interface RegisterContextType {
    activeRegister: CashRegister | null;
    loading: boolean;
    openRegister: (openingBalance: number, notes?: string) => Promise<{ data: CashRegister | null; error: any }>;
    closeRegister: (actualBalance: number, notes?: string) => Promise<{ data: CashRegister | null; error: any }>;
    refreshStatus: () => Promise<void>;
}

const RegisterContext = createContext<RegisterContextType | undefined>(undefined);

export function RegisterProvider({ children }: { children: ReactNode }) {
    const { user } = useAuth();
    const [activeRegister, setActiveRegister] = useState<CashRegister | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (user) {
            checkActiveRegister();
        } else {
            setActiveRegister(null);
            setLoading(false);
        }
    }, [user]);

    const checkActiveRegister = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('cash_registers')
                .select('*')
                .eq('user_id', user?.id)
                .eq('status', 'open')
                .order('opening_time', { ascending: false })
                .limit(1)
                .maybeSingle();

            if (error) throw error;
            setActiveRegister(data);
        } catch (err) {
            console.error('Error checking active register:', err);
        } finally {
            setLoading(false);
        }
    };

    const openRegister = async (openingBalance: number, notes?: string) => {
        try {
            // Check if already has open register
            const { data: existing } = await supabase
                .from('cash_registers')
                .select('id')
                .eq('user_id', user?.id)
                .eq('status', 'open')
                .maybeSingle();

            if (existing) {
                return { data: null, error: new Error('Register sudah terbuka') };
            }

            // Get branch_id from profile if available
            const { data: profile } = await supabase
                .from('profiles')
                .select('branch_id')
                .eq('id', user?.id)
                .single();

            const { data, error } = await supabase
                .from('cash_registers')
                .insert({
                    user_id: user?.id,
                    branch_id: profile?.branch_id || null,
                    opening_balance: openingBalance,
                    status: 'open',
                    notes: notes || null,
                    expected_balance: openingBalance
                })
                .select()
                .single();

            if (error) throw error;
            setActiveRegister(data);
            return { data, error: null };
        } catch (err: any) {
            console.error('Error opening register:', err);
            return { data: null, error: err };
        }
    };

    const closeRegister = async (actualBalance: number, notes?: string) => {
        if (!activeRegister) return { data: null, error: new Error('Tidak ada register yang aktif') };

        try {
            // 1. Calculate total sales since opening
            const { data: transactions, error: salesError } = await supabase
                .from('transactions')
                .select('total_amount')
                .eq('cash_register_id', activeRegister.id)
                .eq('status', 'completed');

            if (salesError) throw salesError;

            const totalSales = transactions?.reduce((sum, t) => sum + t.total_amount, 0) || 0;
            const expectedBalance = activeRegister.opening_balance + totalSales;
            const difference = actualBalance - expectedBalance;

            // 2. Update register
            const { data, error } = await supabase
                .from('cash_registers')
                .update({
                    closing_time: new Date().toISOString(),
                    closing_balance: actualBalance,
                    total_sales: totalSales,
                    expected_balance: expectedBalance,
                    actual_balance: actualBalance,
                    difference: difference,
                    status: 'closed',
                    notes: notes ? `${activeRegister.notes || ''}\nClosing note: ${notes}` : activeRegister.notes
                })
                .eq('id', activeRegister.id)
                .select()
                .single();

            if (error) throw error;
            setActiveRegister(null);
            return { data, error: null };
        } catch (err: any) {
            console.error('Error closing register:', err);
            return { data: null, error: err };
        }
    };

    const refreshStatus = async () => {
        await checkActiveRegister();
    };

    return (
        <RegisterContext.Provider value={{ activeRegister, loading, openRegister, closeRegister, refreshStatus }}>
            {children}
        </RegisterContext.Provider>
    );
}

export function useRegister() {
    const context = useContext(RegisterContext);
    if (context === undefined) {
        throw new Error('useRegister must be used within a RegisterProvider');
    }
    return context;
}
