import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import { useOffline } from './OfflineContext';

export interface StoreSettings {
    storeName: string;
    storeAddress: string;
    storePhone: string;
    openTime: string;
    closeTime: string;
    footerMessage: string;
    paperSize: string;
    autoPrint: boolean;
    enforceShift: boolean; // New setting
    enableQris: boolean;
    enableTransfer: boolean;
    enableDebit: boolean;
    enableCredit: boolean;
    showTableNumber: boolean;
    showCustomerName: boolean;
    showCashierName: boolean;
    showServerName: boolean;
    showOrderDate: boolean;
    showDiscount: boolean;
    showPreviewBeforePay: boolean;
    // UI Toggles (previously in UIPreferencesContext)
    showTable: boolean;
    showRecall: boolean;
    showGuest: boolean;
    showManual: boolean;
    enableGreeting: boolean; // New setting
}

interface StoreContextType {
    settings: StoreSettings;
    updateSettings: (newSettings: Partial<StoreSettings>) => Promise<boolean>;
    loading: boolean;
    refreshSettings: () => Promise<void>;
}

const defaultSettings: StoreSettings = {
    storeName: 'WUDKopi',
    storeAddress: '',
    storePhone: '',
    openTime: '08:00',
    closeTime: '22:00',
    footerMessage: 'Terima Kasih atas Kunjungan Anda',
    paperSize: '58mm',
    autoPrint: false,
    enableQris: true,
    enableTransfer: true,
    enableDebit: true,
    enableCredit: true,
    showTableNumber: true,
    showCustomerName: true,
    showCashierName: true,
    showServerName: true,
    showOrderDate: true,
    showDiscount: true,
    showPreviewBeforePay: false,
    showTable: true,
    showRecall: true,
    showGuest: true,
    showManual: true,
    enforceShift: false,
    enableGreeting: true, // Default is true
};

const StoreContext = createContext<StoreContextType | undefined>(undefined);

export function StoreProvider({ children }: { children: ReactNode }) {
    const [settings, setSettings] = useState<StoreSettings>(defaultSettings);
    const [loading, setLoading] = useState(true);
    const { isOnline } = useOffline();

    useEffect(() => {
        init();

        // Realtime Subscription
        const channel = supabase
            .channel('store_configs_changes')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'store_configs' },
                (payload) => {
                    console.log('Store Config Sync: Remote change detected', payload);
                    if (payload.new) {
                        applyRemoteData(payload.new);
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [isOnline]);

    const init = async () => {
        try {
            // 1. Load from AsyncStorage first (Fast UI)
            const localData = await AsyncStorage.getItem('store_settings_v2');
            if (localData) {
                setSettings(JSON.parse(localData));
            }

            // 2. Sync from Supabase if online
            if (isOnline) {
                await syncFromRemote();
            }
        } catch (error) {
            console.error('StoreContext Init Error:', error);
        } finally {
            setLoading(false);
        }
    };

    const applyRemoteData = (data: any) => {
        if (!data) return;

        setSettings(prev => {
            const next: StoreSettings = {
                ...prev,
                storeName: data.store_name ?? prev.storeName,
                storeAddress: data.store_address ?? prev.storeAddress,
                storePhone: data.store_phone ?? prev.storePhone,
                openTime: data.open_time ?? prev.openTime,
                closeTime: data.close_time ?? prev.closeTime,
                footerMessage: data.footer_message ?? prev.footerMessage,
                paperSize: data.paper_size ?? prev.paperSize,
                autoPrint: data.auto_print ?? prev.autoPrint,
                enforceShift: data.enforce_shift ?? prev.enforceShift,
                enableQris: data.enable_qris ?? prev.enableQris,
                enableTransfer: data.enable_transfer ?? prev.enableTransfer,
                enableDebit: data.enable_debit ?? prev.enableDebit,
                enableCredit: data.enable_credit ?? prev.enableCredit,
                showTableNumber: data.show_table_number ?? prev.showTableNumber,
                showCustomerName: data.show_customer_name ?? prev.showCustomerName,
                showCashierName: data.show_cashier_name ?? prev.showCashierName,
                showServerName: data.show_server_name ?? prev.showServerName,
                showOrderDate: data.show_order_date ?? prev.showOrderDate,
                showDiscount: data.show_discount ?? prev.showDiscount,
                showPreviewBeforePay: data.show_preview_before_pay ?? prev.showPreviewBeforePay,
            };

            // Merge JSONB settings (UI Toggles)
            if (data.settings) {
                next.showTable = data.settings.showTable ?? next.showTable;
                next.showRecall = data.settings.showRecall ?? next.showRecall;
                next.showGuest = data.settings.showGuest ?? next.showGuest;
                next.showManual = data.settings.showManual ?? next.showManual;
                next.enableGreeting = data.settings.enableGreeting ?? next.enableGreeting;
            }

            AsyncStorage.setItem('store_settings_v2', JSON.stringify(next));
            return next;
        });
    };

    const syncFromRemote = async () => {
        try {
            const { data, error } = await supabase
                .from('store_configs')
                .select('*')
                .limit(1)
                .maybeSingle();

            if (error) throw error;
            if (data) {
                applyRemoteData(data);
            }
        } catch (error) {
            console.warn('StoreContext: Failed to sync from remote', error);
        }
    };

    const updateSettings = async (newPartialSettings: Partial<StoreSettings>): Promise<boolean> => {
        try {
            // 1. Update State & Local Storage (Optimistic)
            let updated: StoreSettings = settings;
            setSettings(prev => {
                updated = { ...prev, ...newPartialSettings };
                AsyncStorage.setItem('store_settings_v2', JSON.stringify(updated));
                return updated;
            });

            // 2. Sync to Supabase if online
            if (isOnline) {
                const payload = {
                    store_name: updated.storeName,
                    store_address: updated.storeAddress,
                    store_phone: updated.storePhone,
                    open_time: updated.openTime,
                    close_time: updated.closeTime,
                    footer_message: updated.footerMessage,
                    paper_size: updated.paperSize,
                    auto_print: updated.autoPrint,
                    enforce_shift: updated.enforceShift,
                    enable_qris: updated.enableQris,
                    enable_transfer: updated.enableTransfer,
                    enable_debit: updated.enableDebit,
                    enable_credit: updated.enableCredit,
                    show_table_number: updated.showTableNumber,
                    show_customer_name: updated.showCustomerName,
                    show_cashier_name: updated.showCashierName,
                    show_server_name: updated.showServerName,
                    show_order_date: updated.showOrderDate,
                    show_discount: updated.showDiscount,
                    show_preview_before_pay: updated.showPreviewBeforePay,
                    settings: {
                        showTable: updated.showTable,
                        showRecall: updated.showRecall,
                        showGuest: updated.showGuest,
                        showManual: updated.showManual,
                        enableGreeting: updated.enableGreeting,
                    }
                };

                const { data: existing } = await supabase.from('store_configs').select('id').limit(1).maybeSingle();

                if (existing) {
                    const { error } = await supabase.from('store_configs').update(payload).eq('id', existing.id);
                    if (error) throw error;
                } else {
                    const { error } = await supabase.from('store_configs').insert([payload]);
                    if (error) throw error;
                }
            }
            return true;
        } catch (error) {
            console.error('StoreContext: Failed to update settings', error);
            return false;
        }
    };

    const refreshSettings = async () => {
        setLoading(true);
        await syncFromRemote();
        setLoading(false);
    };

    return (
        <StoreContext.Provider value={{ settings, updateSettings, loading, refreshSettings }}>
            {children}
        </StoreContext.Provider>
    );
}

export function useStore() {
    const context = useContext(StoreContext);
    if (context === undefined) {
        throw new Error('useStore must be used within a StoreProvider');
    }
    return context;
}
