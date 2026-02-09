import { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { Settings, Plus, Users, Square } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Link, useFocusEffect } from 'expo-router';
import tw from 'twrnc';
import { NetworkStatus } from './NetworkStatus';
import AsyncStorage from '@react-native-async-storage/async-storage';

export function HeaderModern() {
    const { user, role } = useAuth();
    const insets = useSafeAreaInsets();

    // Default values as requested
    const [storeName, setStoreName] = useState('WUDKopi');
    const [appName, setAppName] = useState('KASIR KAFE');

    useFocusEffect(
        useCallback(() => {
            loadSettings();
        }, [])
    );

    const loadSettings = async () => {
        try {
            const settings = await AsyncStorage.getItem('store_settings');
            if (settings) {
                const parsed = JSON.parse(settings);
                if (parsed.storeName) setStoreName(parsed.storeName);
                // App Name is not in settings currently, keeping it static or could be added later.
                // For now, user requested "kasir kafe sebagai nama aplikasi" which matches the default.
            }
        } catch (error) {
            console.error('Failed to load header settings', error);
        }
    };

    return (
        <View style={{ paddingTop: insets.top, backgroundColor: 'white' }}>
            <View style={tw`flex-row items-center justify-between px-5 py-4`}>
                {/* Removed border-b, added more padding for specious feel */}
                <View style={tw`flex-row items-center gap-3`}>
                    <View>
                        <Text style={tw`font-extrabold text-2xl text-slate-800 tracking-tight`}>{storeName}</Text>
                        <View style={tw`flex-row items-center gap-2`}>
                            <Text style={tw`text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full uppercase`}>{appName}</Text>
                            <NetworkStatus />
                        </View>
                        <Text style={tw`text-[9px] text-gray-400 mt-0.5 italic`}>
                            {role === 'admin' ? 'Admin' : 'Kasir'}: {user?.email?.split('@')[0]}
                        </Text>
                    </View>
                </View>

                <View style={tw`flex-row items-center gap-2`}>
                    <Link href="/customers" asChild>
                        <TouchableOpacity
                            style={tw`p-2.5 rounded-full bg-slate-50 active:bg-slate-100`}
                        >
                            <Users size={22} color="#475569" />
                        </TouchableOpacity>
                    </Link>
                    <Link href="/tables" asChild>
                        <TouchableOpacity
                            style={tw`p-2.5 rounded-full bg-slate-50 active:bg-slate-100`}
                        >
                            <Square size={22} color="#475569" />
                        </TouchableOpacity>
                    </Link>
                    <Link href="/products" asChild>
                        <TouchableOpacity
                            style={tw`p-2.5 rounded-full bg-slate-50 active:bg-slate-100`}
                        >
                            <Plus size={22} color="#475569" />
                        </TouchableOpacity>
                    </Link>
                    <Link href="/profile" asChild>
                        <TouchableOpacity
                            style={tw`p-2.5 rounded-full bg-slate-50 active:bg-slate-100 ml-1`}
                        >
                            <Settings size={22} color="#1e293b" />
                        </TouchableOpacity>
                    </Link>
                </View>
            </View>
        </View>
    );
}
