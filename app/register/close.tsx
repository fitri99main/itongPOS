import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useRegister } from '../../context/RegisterContext';
import { supabase } from '../../lib/supabase';
import { ArrowLeft, Landmark, Calculator, Receipt, AlertCircle, CheckCircle2 } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import tw from 'twrnc';

export default function CloseRegister() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { activeRegister, closeRegister } = useRegister();
    const [actualBalance, setActualBalance] = useState('');
    const [notes, setNotes] = useState('');
    const [loading, setLoading] = useState(false);
    const [summary, setSummary] = useState({ totalSales: 0, expected: 0 });
    const [calculating, setCalculating] = useState(true);

    useEffect(() => {
        if (activeRegister) {
            fetchSummary();
        }
    }, [activeRegister]);

    const fetchSummary = async () => {
        try {
            const { data, error } = await supabase
                .from('transactions')
                .select('total_amount')
                .eq('cash_register_id', activeRegister?.id)
                .eq('status', 'completed');

            if (error) throw error;

            const totalSales = data?.reduce((sum, t) => sum + t.total_amount, 0) || 0;
            const expected = (activeRegister?.opening_balance || 0) + totalSales;

            setSummary({ totalSales, expected });
            // Default actual balance to expected to help user
            setActualBalance(expected.toString());
        } catch (error) {
            console.error('Error fetching summary:', error);
        } finally {
            setCalculating(false);
        }
    };

    const handleClose = async () => {
        const numActual = parseFloat(actualBalance.replace(/[^0-9]/g, '')) || 0;

        const diff = numActual - summary.expected;

        if (Math.abs(diff) > 0) {
            Alert.alert(
                'Selisih Ditemukan',
                `Ada selisih sebesar Rp ${diff.toLocaleString('id-ID')}. Apakah Anda yakin ingin menutup kasir?`,
                [
                    { text: 'Batal', style: 'cancel' },
                    { text: 'Ya, Tutup', onPress: () => performClose(numActual) }
                ]
            );
        } else {
            performClose(numActual);
        }
    };

    const performClose = async (numActual: number) => {
        setLoading(true);
        try {
            const { error } = await closeRegister(numActual, notes);
            if (error) throw error;

            Alert.alert('Berhasil', 'Kasir telah ditutup. Shift berakhir.');
            router.replace('/register');
        } catch (error: any) {
            Alert.alert('Gagal', error.message || 'Terjadi kesalahan saat menutup kasir');
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (val: string) => {
        const clean = val.toString().replace(/[^0-9]/g, '');
        if (!clean) return '';
        return parseInt(clean).toLocaleString('id-ID');
    };

    if (calculating) {
        return (
            <View style={tw`flex-1 justify-center items-center bg-gray-50`}>
                <ActivityIndicator color="#2563eb" />
                <Text style={tw`text-gray-500 mt-2`}>Menghitung ringkasan penjualan...</Text>
            </View>
        );
    }

    const diff = (parseFloat(actualBalance.replace(/[^0-9]/g, '')) || 0) - summary.expected;

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={[tw`flex-1 bg-gray-50`, { paddingTop: insets.top }]}
        >
            {/* Header */}
            <View style={tw`bg-white px-4 py-4 border-b border-gray-200 flex-row items-center gap-4`}>
                <TouchableOpacity onPress={() => router.back()} style={tw`p-2`}>
                    <ArrowLeft size={24} color="#4b5563" />
                </TouchableOpacity>
                <Text style={tw`text-xl font-bold text-gray-900`}>Tutup Kasir</Text>
            </View>

            <ScrollView contentContainerStyle={tw`p-6`}>
                <View style={tw`bg-red-600 rounded-2xl p-6 mb-6 shadow-lg`}>
                    <View style={tw`flex-row justify-between items-center`}>
                        <View>
                            <Text style={tw`text-red-100 font-medium`}>Ringkasan Shift</Text>
                            <Text style={tw`text-white text-2xl font-bold mt-1`}>Akhiri Sesi Kasir</Text>
                        </View>
                        <Receipt size={40} color="white" opacity={0.8} />
                    </View>
                </View>

                {/* Financial Summary */}
                <View style={tw`bg-white rounded-2xl p-6 mb-6 shadow-sm border border-gray-100`}>
                    <View style={tw`flex-row justify-between mb-4`}>
                        <Text style={tw`text-gray-500`}>Modal Awal</Text>
                        <Text style={tw`text-gray-900 font-bold`}>Rp {activeRegister?.opening_balance.toLocaleString('id-ID')}</Text>
                    </View>
                    <View style={tw`flex-row justify-between mb-4`}>
                        <Text style={tw`text-gray-500`}>Total Penjualan</Text>
                        <Text style={tw`text-green-600 font-bold`}>+ Rp {summary.totalSales.toLocaleString('id-ID')}</Text>
                    </View>
                    <View style={tw`h-[1px] bg-gray-100 mb-4`} />
                    <View style={tw`flex-row justify-between`}>
                        <Text style={tw`text-gray-900 font-bold`}>Uang Seharusnya</Text>
                        <Text style={tw`text-blue-600 font-bold text-lg`}>Rp {summary.expected.toLocaleString('id-ID')}</Text>
                    </View>
                </View>

                {/* Actual Count */}
                <View style={tw`bg-white rounded-2xl p-6 mb-6 shadow-sm border border-gray-100`}>
                    <View style={tw`flex-row items-center gap-2 mb-4`}>
                        <Calculator size={20} color="#4b5563" />
                        <Text style={tw`text-gray-700 font-bold text-lg`}>Uang Fisik (Kenyataan)</Text>
                    </View>

                    <View style={tw`flex-row items-center bg-gray-50 rounded-xl px-4 border border-gray-200 mb-4`}>
                        <Text style={tw`text-gray-400 font-bold text-lg mr-2`}>Rp</Text>
                        <TextInput
                            style={tw`flex-1 py-4 text-xl font-bold text-gray-900`}
                            placeholder="0"
                            keyboardType="numeric"
                            value={formatCurrency(actualBalance)}
                            onChangeText={(val) => setActualBalance(val)}
                        />
                    </View>

                    {/* Difference Alert */}
                    {Math.abs(diff) > 0 ? (
                        <View style={[tw`p-3 rounded-lg flex-row gap-2 items-center`, diff > 0 ? tw`bg-blue-50` : tw`bg-red-50`]}>
                            <AlertCircle size={18} color={diff > 0 ? '#2563eb' : '#dc2626'} />
                            <Text style={[tw`font-medium`, diff > 0 ? tw`text-blue-700` : tw`text-red-700`]}>
                                {diff > 0 ? 'Surplus' : 'Defisit'}: Rp {Math.abs(diff).toLocaleString('id-ID')}
                            </Text>
                        </View>
                    ) : (
                        <View style={tw`bg-green-50 p-3 rounded-lg flex-row gap-2 items-center`}>
                            <CheckCircle2 size={18} color="#16a34a" />
                            <Text style={tw`text-green-700 font-medium`}>Saldo Sesuai (Balance)</Text>
                        </View>
                    )}
                </View>

                {/* Notes */}
                <View style={tw`bg-white rounded-2xl p-6 mb-8 shadow-sm border border-gray-100`}>
                    <Text style={tw`text-gray-700 font-bold mb-2`}>Alasan Selisih / Catatan</Text>
                    <TextInput
                        style={tw`bg-gray-50 rounded-xl px-4 py-4 text-gray-900 border border-gray-200`}
                        placeholder="Contoh: Salah kembalian, uang rusak, dll..."
                        multiline
                        numberOfLines={3}
                        value={notes}
                        onChangeText={setNotes}
                        textAlignVertical="top"
                    />
                </View>

                <TouchableOpacity
                    onPress={handleClose}
                    disabled={loading}
                    style={[tw`bg-red-600 py-4 rounded-xl items-center shadow-lg active:bg-red-700 mb-10`, loading && tw`opacity-70`]}
                >
                    {loading ? (
                        <ActivityIndicator color="white" />
                    ) : (
                        <Text style={tw`text-white font-bold text-lg`}>Tutup Kasir & Akhiri Shift</Text>
                    )}
                </TouchableOpacity>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}
