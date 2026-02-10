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
        const checkConnection = async (state?: any) => {
            if (isManualOffline) {
                setIsOnline(false);
                return;
            }

            // Get current state if not provided
            const currentState = state || await NetInfo.fetch();

            // Trust isConnected: false immediately (Wifi off or Airplane mode)
            if (!currentState.isConnected) {
                console.log('[OfflineContext] isConnected is false. Setting offline.');
                setIsOnline(false);
                return;
            }

            // Perform a quick ping to be sure.
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 4000);

                // Use the Supabase URL instead of Google to ensure the actual backend is reachable
                // This prevents false positives from mobile data where Google might work but Supabase is blocked
                // or where a captive portal redirects the request.
                const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
                const pingUrl = supabaseUrl ? `${supabaseUrl}/rest/v1/` : 'https://www.google.com/generate_204';

                const res = await fetch(pingUrl, {
                    method: 'GET',
                    mode: 'no-cors',
                    signal: controller.signal,
                    cache: 'no-store'
                });

                clearTimeout(timeoutId);

                // For Supabase/Google, res.status 204 or 0 (standard for no-cors success) is good.
                // Redirects (3xx) or Errors (4xx/5xx) would usually fall through, but 401/403 from 
                // Supabase means we successfully reached the server, so we are online.
                if (res.status === 204 || res.status === 0 || (res.status >= 200 && res.status < 300) || res.status === 401 || res.status === 403) {
                    console.log('[OfflineContext] Ping success to', pingUrl, 'Status:', res.status, 'Setting online.');
                    setIsOnline(true);
                } else {
                    console.log('[OfflineContext] Ping failed (Unexpected status:', res.status, ')');
                    setIsOnline(false);
                }
            } catch (e) {
                console.log('[OfflineContext] Ping failed (Network error or timeout):', e);
                setIsOnline(false);
            }
        };

        // Initial check
        checkConnection();

        // Subscribe to NetInfo events
        const unsubscribe = NetInfo.addEventListener(state => {
            console.log('[OfflineContext] NetInfo event:', state.isConnected, state.isInternetReachable);
            checkConnection(state);
        });

        // Periodic "Watchdog" Ping (Every 10 seconds)
        // This handles cases where NetInfo fails to detect "Connected but No Internet" transitions
        const intervalId = setInterval(() => {
            checkConnection();
        }, 10000);

        // Load queue from storage on startup
        loadQueue();

        return () => {
            unsubscribe();
            clearInterval(intervalId);
        };
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
        } catch (error) {
            console.error('Failed to save offline queue to storage:', error);
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

        setQueue(prevQueue => {
            const updatedQueue = [...prevQueue, newAction];
            saveQueue(updatedQueue);
            return updatedQueue;
        });

        Alert.alert('Offline Mode', 'Data disimpan di perangkat dan akan dikirim saat online.');
    };

    // ... processQueue ...
    const processQueue = async () => {
        if (isSyncing) return;
        setIsSyncing(true);

        // Snapshot current queue to process
        const currentQueue = [...queue];
        const failedActions: OfflineAction[] = [];

        console.log(`Processing ${currentQueue.length} offline actions...`);

        for (const action of currentQueue) {
            try {
                if (action.type === 'INSERT_TRANSACTION') {
                    const { payload } = action;

                    let transactionData = payload.transaction;

                    // Patch missing user_id if needed
                    if (!transactionData.user_id) {
                        const { data: { session } } = await supabase.auth.getSession();
                        if (session?.user?.id) {
                            console.log('Patching missing user_id for sync:', session.user.id);
                            transactionData = { ...transactionData, user_id: session.user.id };
                        }
                    }

                    // Patch missing branch_id for legacy queue items
                    if (!transactionData.branch_id) {
                        const branchId = await AsyncStorage.getItem('selected_branch_id');
                        if (branchId) {
                            console.log('Patching missing branch_id for sync:', branchId);
                            transactionData = { ...transactionData, branch_id: branchId };
                        }
                    }

                    // Log transaction data for debugging
                    console.log('Attempting to sync transaction:', {
                        user_id: transactionData.user_id,
                        branch_id: transactionData.branch_id,
                        cash_register_id: transactionData.cash_register_id,
                        customer_id: transactionData.customer_id,
                        total_amount: transactionData.total_amount
                    });

                    // Insert Transaction
                    const { data: transData, error: transError } = await supabase
                        .from('transactions')
                        .insert(transactionData)
                        .select()
                        .single();

                    if (transError) {
                        console.error('Transaction insert failed:', {
                            code: transError.code,
                            message: transError.message,
                            details: transError.details,
                            hint: transError.hint
                        });
                        throw transError;
                    }

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
                failedActions.push(action);
            }
        }

        // Update state and storage with remaining/newly failed items
        setQueue(prevQueue => {
            // Filter out the ones that were successfully processed from currentQueue
            // currentQueue contains the ones we TRIED to process.
            // failedActions contains the ones from currentQueue that FAILED.
            // Items added to prevQueue while we were processing are NOT in currentQueue.

            const syncedIds = currentQueue
                .filter(a => !failedActions.find(f => f.id === a.id))
                .map(a => a.id);

            const updatedQueue = prevQueue.filter(a => !syncedIds.includes(a.id));
            saveQueue(updatedQueue);
            return updatedQueue;
        });

        setIsSyncing(false);

        const successCount = currentQueue.length - failedActions.length;
        if (successCount > 0) {
            Alert.alert('Sinkronisasi Berhasil', `${successCount} data offline telah terkirim.`);
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
