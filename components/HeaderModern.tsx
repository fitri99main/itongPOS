import { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, useWindowDimensions } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { Settings, Plus, Users, Square } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Link, useFocusEffect } from 'expo-router';
import tw from 'twrnc';
import { NetworkStatus } from './NetworkStatus';
import { useOffline } from '../context/OfflineContext';
import { useStore } from '../context/StoreContext';

export function HeaderModern() {
    const { user, role } = useAuth();
    const { isOnline } = useOffline();
    const insets = useSafeAreaInsets();
    const { settings } = useStore();
    const { width } = useWindowDimensions();

    // Responsive scaling
    const storeNameSize = width > 600 ? 'text-3xl' : 'text-2xl';
    const appNameSize = width > 600 ? 'text-sm' : 'text-xs';

    // App Name is static as per request
    const appName = 'KASIR KAFE';

    return (
        <View style={{ paddingTop: insets.top, backgroundColor: 'white' }}>
            <View style={tw`flex-row items-center justify-between px-5 py-4`}>
                {/* Removed border-b, added more padding for specious feel */}
                <View style={tw`flex-row items-center gap-3`}>
                    <View>
                        <Text style={tw`font-extrabold ${storeNameSize} text-slate-800 tracking-tight`}>{settings.storeName}</Text>
                        <View style={tw`flex-row items-center gap-2`}>
                            <Text style={tw`font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full uppercase ${appNameSize}`}>{appName}</Text>
                            <NetworkStatus />
                        </View>
                        <View style={tw`flex-row items-center gap-1.5 mt-0.5`}>
                            <View style={[
                                tw`w-2.5 h-2.5 rounded-full`,
                                !isOnline ? tw`bg-red-500` :
                                    role === 'admin' ? tw`bg-blue-400` : tw`bg-green-400`
                            ]} />
                            <Text style={[
                                tw`text-[10px] font-bold`,
                                !isOnline ? tw`text-red-600` : tw`text-gray-400`
                            ]}>
                                {!isOnline ? 'DISCONNECTED' : (role === 'admin' ? 'ADMIN' : 'KASIR')}
                            </Text>
                        </View>
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
