import { useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useRegister } from '../../context/RegisterContext';
import { useStore } from '../../context/StoreContext';
import { useAuth } from '../../context/AuthContext';
import * as Speech from 'expo-speech';
import { ArrowLeft, CircleDollarSign, Info } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import tw from 'twrnc';
import { ConfirmationModal } from '../../components/ConfirmationModal';

export default function OpenRegister() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { openRegister } = useRegister();
    const { settings } = useStore();
    const { role } = useAuth();
    const [balance, setBalance] = useState('');
    const [notes, setNotes] = useState('');
    const [loading, setLoading] = useState(false);

    // Modal State
    const [showModal, setShowModal] = useState(false);
    const [modalConfig, setModalConfig] = useState({
        title: '',
        message: '',
        type: 'info' as 'info' | 'success' | 'danger' | 'warning',
    });

    const handleOpen = async () => {
        const numBalance = parseFloat(balance.replace(/[^0-9]/g, '')) || 0;

        if (numBalance < 0) {
            setModalConfig({
                title: 'Error',
                message: 'Modal awal tidak boleh kurang dari 0',
                type: 'danger'
            });
            setShowModal(true);
            return;
        }

        setLoading(true);
        try {
            const { error } = await openRegister(numBalance, notes);
            if (error) throw error;

            // Play greeting if enabled and user is a cashier
            const roleName = role?.toLowerCase()?.trim() || '';
            const isCashier = roleName.includes('kasir') || roleName.includes('cashier');

            if (settings.enableGreeting && isCashier) {
                try {
                    console.log('[OpenRegister] 📢 Triggering speech engine...');
                    await Speech.stop(); // Clear any existing queue
                    Speech.speak('Assalamualaikum warahmatullahi wabarakatuh', {
                        language: 'id-ID',
                        pitch: 1.0,
                        rate: 0.9,
                        onStart: () => console.log('[OpenRegister] 🔊 Speech started successfully'),
                        onDone: () => console.log('[OpenRegister] ✅ Speech finished'),
                        onError: (error) => console.error('[OpenRegister] ❌ Speech error:', error)
                    });
                } catch (e) {
                    console.error('[OpenRegister] Speech exception:', e);
                }
            }

            // Small delay to ensure speech engine bridge is triggered before the component unmounts
            setTimeout(() => {
                setModalConfig({
                    title: 'Berhasil',
                    message: 'Sesi kasir telah dibuka.',
                    type: 'success'
                });
                setShowModal(true);
            }, 1200);
        } catch (error: any) {
            setModalConfig({
                title: 'Gagal',
                message: error.message || 'Terjadi kesalahan saat membuka kasir',
                type: 'danger'
            });
            setShowModal(true);
        } finally {
            setLoading(false);
        }
    };

    // Simple currency formatter as user types
    const formatCurrency = (val: string) => {
        const clean = val.replace(/[^0-9]/g, '');
        if (!clean) return '';
        return parseInt(clean).toLocaleString('id-ID');
    };

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
                <Text style={tw`text-xl font-bold text-gray-900`}>Buka Kasir</Text>
            </View>

            <ScrollView contentContainerStyle={tw`p-6`}>
                <View style={tw`bg-blue-600 rounded-2xl p-6 mb-8 shadow-lg items-center`}>
                    <View style={tw`w-16 h-16 rounded-full bg-white items-center justify-center shadow-sm`}>
                        <Text style={tw`text-blue-600 text-2xl font-black`}>Rp</Text>
                    </View>
                    <Text style={tw`text-white text-xl font-bold mt-4`}>Masukkan Modal Awal</Text>
                    <Text style={tw`text-blue-100 mt-2 text-center`}>
                        Jumlah uang tunai yang ada di laci kasir saat ini.
                    </Text>
                </View>

                <View style={tw`bg-white rounded-2xl p-6 shadow-sm border border-gray-100`}>
                    <Text style={tw`text-gray-700 font-bold mb-2`}>Modal Tunai (Cash on Hand)</Text>
                    <View style={tw`flex-row items-center bg-gray-50 rounded-xl px-4 border border-gray-200 mb-6`}>
                        <Text style={tw`text-gray-400 font-bold text-lg mr-2`}>Rp</Text>
                        <TextInput
                            style={tw`flex-1 py-4 text-xl font-bold text-gray-900`}
                            placeholder="0"
                            keyboardType="numeric"
                            value={formatCurrency(balance)}
                            onChangeText={(val) => setBalance(val)}
                            autoFocus
                        />
                    </View>

                    <Text style={tw`text-gray-700 font-bold mb-2`}>Catatan (Optional)</Text>
                    <TextInput
                        style={tw`bg-gray-50 rounded-xl px-4 py-4 text-gray-900 border border-gray-200 mb-8`}
                        placeholder="Tambahkan catatan jika perlu..."
                        multiline
                        numberOfLines={3}
                        value={notes}
                        onChangeText={setNotes}
                        textAlignVertical="top"
                    />

                    <View style={tw`bg-blue-50 p-4 rounded-xl flex-row gap-3 mb-8`}>
                        <Info size={20} color="#2563eb" />
                        <Text style={tw`flex-1 text-blue-700 text-sm`}>
                            Membuka kasir akan mencatat waktu awal shift Anda dan modal yang Anda pegang.
                        </Text>
                    </View>

                    <TouchableOpacity
                        onPress={handleOpen}
                        disabled={loading}
                        style={[tw`bg-blue-600 py-4 rounded-xl items-center shadow-md`, loading && tw`opacity-70`]}
                    >
                        {loading ? (
                            <ActivityIndicator color="white" />
                        ) : (
                            <Text style={tw`text-white font-bold text-lg`}>Mulai Shift Sekarang</Text>
                        )}
                    </TouchableOpacity>
                </View>
            </ScrollView>

            <ConfirmationModal
                visible={showModal}
                title={modalConfig.title}
                message={modalConfig.message}
                type={modalConfig.type}
                confirmText="Selesai"
                cancelText={null}
                onConfirm={() => {
                    setShowModal(false);
                    if (modalConfig.type === 'success') {
                        router.replace('/' as any);
                    }
                }}
                onCancel={() => setShowModal(false)}
            />
        </KeyboardAvoidingView>
    );
}
