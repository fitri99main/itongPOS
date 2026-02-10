import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, Platform } from 'react-native';
import { useOffline } from '../context/OfflineContext';
import { Wifi, WifiOff, RefreshCw, CheckCircle2 } from 'lucide-react-native';
import tw from 'twrnc';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export function NetworkStatus() {
    const { isOnline, isSyncing, queue } = useOffline();
    const insets = useSafeAreaInsets();
    const fadeAnim = useRef(new Animated.Value(0)).current;

    // Determine Status
    // 1. Offline -> Red
    // 2. Online + Syncing -> Yellow
    // 3. Online + Queue not empty (pending sync) -> Yellow
    // 4. Online + Synced -> Green

    let status: 'offline' | 'syncing' | 'synced' = 'synced';
    if (!isOnline) status = 'offline';
    else if (isSyncing || queue.length > 0) status = 'syncing';
    else status = 'synced';

    useEffect(() => {
        // Simple entry animation
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
        }).start();
    }, []);

    // Configuration
    const config = {
        offline: {
            bg: 'bg-red-500',
            icon: WifiOff,
            color: 'white'
        },
        syncing: {
            bg: 'bg-yellow-500',
            icon: RefreshCw,
            color: 'white'
        },
        synced: {
            bg: 'bg-green-500',
            icon: Wifi,
            color: 'white'
        }
    };

    const currentConfig = config[status];
    const Icon = currentConfig.icon;

    // Don't show anything if standard "Online & Synced" to keep UI clean?
    // User requested: "Green online". So we show it small.

    return (
        <Animated.View
            style={[
                tw`flex-row items-center px-2 py-0.5 rounded-full ${currentConfig.bg}`,
                {
                    opacity: fadeAnim,
                    marginLeft: 4
                }
            ]}
        >
            <Icon size={12} color={currentConfig.color} />
            <Text style={tw`text-[10px] font-bold text-white ml-1 uppercase`}>
                {status === 'offline' ? 'Offline' : status === 'syncing' ? 'Syncing' : 'Online'}
            </Text>
        </Animated.View>
    );
}
