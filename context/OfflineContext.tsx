import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import NetInfo from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import { Alert } from 'react-native';

// Define the shape of an offline action
export interface OfflineAction {
    id: string;
    type: 'INSERT_TRANSACTION' | 'UPDATE_PRODUCT'; // Expand as needed
    payload: any;
    timestamp: number;
}

interface OfflineContextType {
    isOnline: boolean;
    queue: OfflineAction[];
    addToQueue: (action: Omit<OfflineAction, 'id' | 'timestamp'>) => Promise<void>;
    syncNow: () => Promise<void>;
    isSyncing: boolean;
    isManualOffline: boolean;
    setManualOffline: (enabled: boolean) => Promise<void>;
}

const OfflineContext = createContext<OfflineContextType | undefined>(undefined);

export function OfflineProvider({ children }: { children: ReactNode }) {
    const [isOnline, setIsOnline] = useState(true);
    const [queue, setQueue] = useState<OfflineAction[]>([]);
    const [isSyncing, setIsSyncing] = useState(false);
    const [isManualOffline, setIsManualOffline] = useState(false);

    // 1. Monitor Network State
    useEffect(() => {
        const unsubscribe = NetInfo.addEventListener(state => {
            const online = state.isConnected && state.isInternetReachable;
            // Only update if not manually offline
            if (!isManualOffline) {
                setIsOnline(!!online);
            }
        });

        // Load queue from storage on startup
        loadQueue();

        return () => unsubscribe();
    }, [isManualOffline]); // Re-run listener if manual mode changes

    // Effect to handle manual switch
    useEffect(() => {
        if (isManualOffline) {
            setIsOnline(false);
        } else {
            // Check actual status
            NetInfo.fetch().then(state => {
                setIsOnline(!!(state.isConnected && state.isInternetReachable));
            });
        }
    }, [isManualOffline]);

    // ... existing auto-sync ...
    useEffect(() => {
        if (isOnline && queue.length > 0 && !isSyncing) {
            processQueue();
        }
    }, [isOnline]);

    const loadQueue = async () => {
        try {
            const storedQueue = await AsyncStorage.getItem('offline_queue');
            if (storedQueue) {
                setQueue(JSON.parse(storedQueue));
            }
            // Load manual setting
            const manualSetting = await AsyncStorage.getItem('manual_offline_mode');
            if (manualSetting === 'true') {
                setIsManualOffline(true);
            }
        } catch (error) {
            console.error('Failed to load offline queue:', error);
        }
    };

    // ... saveQueue ...
    const saveQueue = async (newQueue: OfflineAction[]) => {
        try {
            await AsyncStorage.setItem('offline_queue', JSON.stringify(newQueue));
            setQueue(newQueue);
        } catch (error) {
            console.error('Failed to save offline queue:', error);
        }
    };

    const setManualMode = async (enabled: boolean) => {
        setIsManualOffline(enabled);
        await AsyncStorage.setItem('manual_offline_mode', String(enabled));
    };

    // ... addToQueue ...
    const addToQueue = async (action: Omit<OfflineAction, 'id' | 'timestamp'>) => {
        const newAction: OfflineAction = {
            ...action,
            id: Math.random().toString(36).substr(2, 9),
            timestamp: Date.now()
        };
        const newQueue = [...queue, newAction];
        await saveQueue(newQueue);
        Alert.alert('Offline Mode', 'Data disimpan di perangkat dan akan dikirim saat online.');
    };

    // ... processQueue ...
    const processQueue = async () => {
        if (isSyncing) return;
        setIsSyncing(true);

        const currentQueue = [...queue];
        const remainingQueue: OfflineAction[] = [];

        console.log(`Processing ${currentQueue.length} offline actions...`);

        for (const action of currentQueue) {
            try {
                if (action.type === 'INSERT_TRANSACTION') {
                    const { payload } = action;

                    let transactionData = payload.transaction;

                    // Patch missing user_id if needed (e.g. created offline without cached session)
                    if (!transactionData.user_id) {
                        const { data: { session } } = await supabase.auth.getSession();
                        if (session?.user?.id) {
                            console.log('Patching missing user_id for sync:', session.user.id);
                            transactionData = { ...transactionData, user_id: session.user.id };
                        }
                    }

                    // Insert Transaction
                    const { data: transData, error: transError } = await supabase
                        .from('transactions')
                        .insert(transactionData)
                        .select()
                        .single();

                    if (transError) throw transError;

                    // Insert Items with correct transaction_id
                    const items = payload.items.map((item: any) => ({
                        ...item,
                        transaction_id: transData.id
                    }));

                    const { error: itemsError } = await supabase
                        .from('transaction_items')
                        .insert(items);

                    if (itemsError) throw itemsError;

                    console.log(`Synced transaction ${action.id}`);
                }
                // Handle other types if needed
            } catch (error) {
                console.error(`Failed to sync action ${action.id}:`, error);

                remainingQueue.push(action);
            }
        }

        await saveQueue(remainingQueue);
        setIsSyncing(false);

        if (currentQueue.length > remainingQueue.length) {
            Alert.alert('Sinkronisasi Berhasil', `${currentQueue.length - remainingQueue.length} data offline telah terkirim.`);
        }
    };

    return (
        <OfflineContext.Provider value={{ isOnline, queue, addToQueue, syncNow: processQueue, isSyncing, isManualOffline, setManualOffline: setManualMode }}>
            {children}
        </OfflineContext.Provider>
    );
}

export function useOffline() {
    const context = useContext(OfflineContext);
    if (context === undefined) {
        throw new Error('useOffline must be used within an OfflineProvider');
    }
    return context;
}
