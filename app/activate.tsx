import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Image, ScrollView } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useRouter } from 'expo-router';
import { useLicense } from '../context/LicenseContext';
import { Shield, Key, Copy, CheckCircle, Info, RefreshCw } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import tw from 'twrnc';
import { ConfirmationModal } from '../components/ConfirmationModal';

export default function ActivateScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { deviceId, activate, daysLeft, isActivated, loading: statusLoading, refreshStatus } = useLicense();
    const [serial, setSerial] = useState('');
    const [loading, setLoading] = useState(false);

    // Notification Modal State
    const [showStatusModal, setShowStatusModal] = useState(false);
    const [statusModalConfig, setStatusModalConfig] = useState({
        title: '',
        message: '',
        type: 'info' as 'info' | 'success' | 'danger' | 'warning',
        onConfirm: () => { }
    });

    const handleActivate = async () => {
        if (!serial.trim()) {
            setStatusModalConfig({
                title: 'Peringatan',
                message: 'Mohon masukkan Serial Number Anda.',
                type: 'warning',
                onConfirm: () => setShowStatusModal(false)
            });
            setShowStatusModal(true);
            return;
        }

        setLoading(true);
        const result = await activate(serial.trim());
        setLoading(false);

        if (result.success) {
            setStatusModalConfig({
                title: 'Sukses',
                message: result.message,
                type: 'success',
                onConfirm: () => {
                    setShowStatusModal(false);
                    router.replace('/login');
                }
            });
            setShowStatusModal(true);
        } else {
            setStatusModalConfig({
                title: 'Gagal',
                message: result.message,
                type: 'danger',
                onConfirm: () => setShowStatusModal(false)
            });
            setShowStatusModal(true);
        }
    };

    const copyToClipboard = () => {
        Clipboard.setStringAsync(deviceId);
        setStatusModalConfig({
            title: 'Sukses',
            message: 'Device ID disalin ke clipboard.',
            type: 'success',
            onConfirm: () => setShowStatusModal(false)
        });
        setShowStatusModal(true);
    };

    if (statusLoading) {
        return (
            <View style={tw`flex-1 bg-white items-center justify-center`}>
                <ActivityIndicator size="large" color="#2563eb" />
                <Text style={tw`mt-4 text-gray-500`}>Memeriksa status lisensi...</Text>
            </View>
        );
    }

    return (
        <ScrollView
            style={[tw`flex-1 bg-gray-50`, { paddingTop: insets.top }]}
            contentContainerStyle={tw`p-6 pb-20`}
        >
            <View style={tw`items-center mb-10`}>
                <View style={tw`bg-blue-100 p-5 rounded-full mb-6`}>
                    <Shield size={64} color="#2563eb" />
                </View>
                <Text style={tw`text-2xl font-bold text-gray-900 text-center`}>Aktivasi Aplikasi</Text>
                <Text style={tw`text-gray-500 text-center mt-2 px-4`}>
                    Aplikasi ini memerlukan aktivasi Serial Number untuk penggunaan tanpa batas.
                </Text>
            </View>

            {/* Trial Status Card */}
            {!isActivated && (
                <View style={tw`bg-white p-5 rounded-2xl border border-blue-100 shadow-sm mb-6`}>
                    <View style={tw`flex-row items-center gap-3 mb-2`}>
                        <Info size={20} color="#2563eb" />
                        <Text style={tw`text-lg font-bold text-gray-900`}>Mode Uji Coba (Trial)</Text>
                    </View>
                    <Text style={tw`text-gray-600 mb-4`}>
                        Anda sedang menggunakan versi trial. Silakan aktivasi sebelum masa berlaku habis.
                    </Text>

                    <View style={tw`bg-blue-50 p-4 rounded-xl items-center`}>
                        <Text style={tw`text-blue-900 font-bold text-2xl`}>{daysLeft} Hari Lagi</Text>
                        <Text style={tw`text-blue-700 text-xs`}>Sisa Masa Berlaku</Text>
                    </View>
                </View>
            )}

            {isActivated && (
                <View style={tw`bg-green-50 p-5 rounded-2xl border border-green-200 shadow-sm mb-6 items-center`}>
                    <CheckCircle size={48} color="#16a34a" />
                    <Text style={tw`text-green-800 font-bold text-xl mt-3`}>Aplikasi Sudah Aktif</Text>
                    <Text style={tw`text-green-700 text-center mt-1`}>Terima kasih telah berlangganan versi penuh.</Text>
                    <TouchableOpacity
                        onPress={() => router.replace('/login')}
                        style={tw`mt-6 bg-green-600 px-6 py-3 rounded-xl`}
                    >
                        <Text style={tw`text-white font-bold`}>Ke Halaman Login</Text>
                    </TouchableOpacity>
                </View>
            )}

            {!isActivated && (
                <View style={tw`bg-white p-6 rounded-2xl border border-gray-200 shadow-sm`}>
                    <Text style={tw`text-gray-700 font-medium mb-2`}>Masukkan Serial Number</Text>
                    <View style={tw`flex-row items-center bg-gray-50 border border-gray-200 rounded-xl px-4 mb-6`}>
                        <Key size={20} color="#9ca3af" />
                        <TextInput
                            style={tw`flex-1 p-4 text-gray-900 font-bold tracking-widest`}
                            placeholder="XXXX-XXXX-XXXX-XXXX"
                            placeholderTextColor="#d1d5db"
                            autoCapitalize="characters"
                            value={serial}
                            onChangeText={setSerial}
                        />
                    </View>

                    <TouchableOpacity
                        onPress={handleActivate}
                        disabled={loading}
                        style={[
                            tw`py-4 rounded-xl items-center flex-row justify-center gap-3`,
                            loading ? tw`bg-blue-400` : tw`bg-blue-600`
                        ]}
                    >
                        {loading ? (
                            <ActivityIndicator color="white" />
                        ) : (
                            <>
                                <CheckCircle size={20} color="white" />
                                <Text style={tw`text-white font-bold text-lg`}>Aktifkan Sekarang</Text>
                            </>
                        )}
                    </TouchableOpacity>

                    <View style={tw`mt-8 pt-6 border-t border-gray-100`}>
                        <Text style={tw`text-gray-500 text-xs text-center mb-3 uppercase tracking-tighter`}>Device ID Anda (Berikan ke Admin)</Text>
                        <TouchableOpacity
                            onPress={copyToClipboard}
                            style={tw`bg-gray-100 p-4 rounded-xl flex-row items-center justify-between border border-dashed border-gray-300`}
                        >
                            <Text style={tw`text-gray-700 font-mono text-xs flex-1`} numberOfLines={1}>
                                {deviceId}
                            </Text>
                            <Copy size={16} color="#6b7280" />
                        </TouchableOpacity>
                    </View>

                    <TouchableOpacity
                        onPress={() => router.replace('/login')}
                        style={tw`mt-6 items-center`}
                    >
                        <Text style={tw`text-gray-400 font-medium`}>Lanjut dengan Trial &rarr;</Text>
                    </TouchableOpacity>
                </View>
            )}

            <View style={tw`mt-10 items-center gap-4`}>
                <TouchableOpacity
                    onPress={refreshStatus}
                    style={tw`flex-row items-center gap-2`}
                >
                    <RefreshCw size={14} color="#9ca3af" />
                    <Text style={tw`text-gray-400 text-xs`}>Perbarui Status</Text>
                </TouchableOpacity>
                <Text style={tw`text-gray-400 text-[10px] text-center px-10`}>
                    Butuh bantuan? Hubungi CS di +62-XXX-XXXX-XXXX untuk mendapatkan Serial Number.
                </Text>
            </View>
        </ScrollView>
    );
}
