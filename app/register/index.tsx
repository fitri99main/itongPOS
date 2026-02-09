import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useRegister } from '../../context/RegisterContext';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import {
    Store,
    Clock,
    CircleDollarSign,
    ArrowLeft,
    ChevronRight,
    History,
    AlertCircle,
    CheckCircle2
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import tw from 'twrnc';

export default function RegisterIndex() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { activeRegister, loading: registerLoading, refreshStatus } = useRegister();
    const { user } = useAuth();
    const [history, setHistory] = useState<any[]>([]);
    const [loadingHistory, setLoadingHistory] = useState(true);

    useEffect(() => {
        fetchHistory();
    }, []);

    const fetchHistory = async () => {
        try {
            const { data, error } = await supabase
                .from('cash_registers')
                .select('*')
                .eq('user_id', user?.id)
                .order('opening_time', { ascending: false })
                .limit(10);

            if (error) throw error;
            setHistory(data || []);
        } catch (error) {
            console.error('Error fetching register history:', error);
        } finally {
            setLoadingHistory(false);
        }
    };

    if (registerLoading) {
        return (
            <View style={tw`flex-1 justify-center items-center bg-gray-50`}>
                <ActivityIndicator color="#2563eb" />
            </View>
        );
    }

    return (
        <View style={[tw`flex-1 bg-gray-50`, { paddingTop: insets.top }]}>
            {/* Header */}
            <View style={tw`bg-white px-4 py-4 border-b border-gray-200 flex-row items-center gap-4`}>
                <TouchableOpacity onPress={() => router.back()} style={tw`p-2`}>
                    <ArrowLeft size={24} color="#4b5563" />
                </TouchableOpacity>
                <Text style={tw`text-xl font-bold text-gray-900`}>Kasir (Cash Register)</Text>
            </View>

            <ScrollView contentContainerStyle={tw`p-4`}>
                {/* Current Status Card */}
                <View style={tw`bg-white rounded-2xl p-6 mb-6 shadow-sm border border-gray-100`}>
                    <View style={tw`flex-row justify-between items-start mb-4`}>
                        <View>
                            <Text style={tw`text-gray-500 font-medium`}>Status Saat Ini</Text>
                            <View style={tw`flex-row items-center gap-2 mt-1`}>
                                <View style={[tw`w-3 h-3 rounded-full`, activeRegister ? tw`bg-green-500` : tw`bg-red-500`]} />
                                <Text style={tw`text-2xl font-bold text-gray-900`}>
                                    {activeRegister ? 'Kasir Terbuka' : 'Kasir Tertutup'}
                                </Text>
                            </View>
                        </View>
                        <View style={tw`bg-blue-50 p-3 rounded-2xl`}>
                            <Store size={28} color="#2563eb" />
                        </View>
                    </View>

                    {activeRegister ? (
                        <>
                            <View style={tw`bg-gray-50 rounded-xl p-4 mb-4`}>
                                <View style={tw`flex-row justify-between mb-2`}>
                                    <Text style={tw`text-gray-500`}>Dibuka Sejak</Text>
                                    <Text style={tw`text-gray-900 font-medium`}>
                                        {new Date(activeRegister.opening_time).toLocaleString('id-ID')}
                                    </Text>
                                </View>
                                <View style={tw`flex-row justify-between`}>
                                    <Text style={tw`text-gray-500`}>Modal Awal</Text>
                                    <Text style={tw`text-blue-600 font-bold`}>
                                        Rp {activeRegister.opening_balance.toLocaleString('id-ID')}
                                    </Text>
                                </View>
                            </View>

                            <TouchableOpacity
                                onPress={() => router.push('/register/close')}
                                style={tw`bg-red-600 py-4 rounded-xl items-center shadow-md active:bg-red-700`}
                            >
                                <Text style={tw`text-white font-bold text-lg`}>Tutup Kasir</Text>
                            </TouchableOpacity>
                        </>
                    ) : (
                        <>
                            <Text style={tw`text-gray-500 mb-6 leading-5`}>
                                Anda harus membuka kasir dan memasukkan modal awal sebelum dapat melakukan transaksi penjualan.
                            </Text>
                            <TouchableOpacity
                                onPress={() => router.push('/register/open')}
                                style={tw`bg-blue-600 py-4 rounded-xl items-center shadow-md active:bg-blue-700`}
                            >
                                <Text style={tw`text-white font-bold text-lg`}>Buka Kasir</Text>
                            </TouchableOpacity>
                        </>
                    )}
                </View>

                {/* History Section */}
                <View style={tw`flex-row items-center gap-2 mb-4`}>
                    <History size={20} color="#6b7280" />
                    <Text style={tw`text-lg font-bold text-gray-900`}>Riwayat Sesi Kasir</Text>
                </View>

                {loadingHistory ? (
                    <ActivityIndicator color="#2563eb" />
                ) : history.length === 0 ? (
                    <View style={tw`bg-white p-8 rounded-2xl items-center border border-dashed border-gray-300`}>
                        <Clock size={40} color="#d1d5db" />
                        <Text style={tw`text-gray-400 mt-2`}>Belum ada riwayat sesi</Text>
                    </View>
                ) : (
                    <View style={tw`gap-3`}>
                        {history.map((item) => (
                            <View key={item.id} style={tw`bg-white p-4 rounded-xl shadow-sm border border-gray-100`}>
                                <View style={tw`flex-row justify-between items-center mb-2`}>
                                    <View style={tw`flex-row items-center gap-2`}>
                                        {item.status === 'open' ? (
                                            <AlertCircle size={16} color="#eab308" />
                                        ) : (
                                            <CheckCircle2 size={16} color="#16a34a" />
                                        )}
                                        <Text style={tw`font-bold text-gray-900`}>
                                            {new Date(item.opening_time).toLocaleDateString('id-ID')}
                                        </Text>
                                    </View>
                                    <View style={[tw`px-2 py-1 rounded-full`, item.status === 'open' ? tw`bg-yellow-100` : tw`bg-gray-100`]}>
                                        <Text style={[tw`text-[10px] font-bold uppercase`, item.status === 'open' ? tw`text-yellow-700` : tw`text-gray-600`]}>
                                            {item.status === 'open' ? 'Berjalan' : 'Selesai'}
                                        </Text>
                                    </View>
                                </View>

                                <View style={tw`flex-row justify-between text-xs`}>
                                    <Text style={tw`text-gray-500 text-xs`}>
                                        {new Date(item.opening_time).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                                        {item.closing_time && ` - ${new Date(item.closing_time).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}`}
                                    </Text>
                                    <Text style={tw`text-gray-500 text-xs`}>
                                        Modal: Rp {item.opening_balance.toLocaleString('id-ID')}
                                    </Text>
                                </View>

                                {item.status === 'closed' && (
                                    <View style={tw`mt-2 pt-2 border-t border-gray-50 flex-row justify-between`}>
                                        <Text style={tw`text-gray-400 text-xs`}>Total Penjualan</Text>
                                        <Text style={tw`text-gray-900 font-bold text-xs`}>Rp {item.total_sales?.toLocaleString('id-ID') || 0}</Text>
                                    </View>
                                )}
                            </View>
                        ))}
                    </View>
                )}

                <View style={tw`h-10`} />
            </ScrollView>
        </View>
    );
}
