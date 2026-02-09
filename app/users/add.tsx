import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { ArrowLeft, User, Mail, Lock, Check } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import tw from 'twrnc';
import { ConfirmationModal } from '../../components/ConfirmationModal';

export default function AddUserScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const [loading, setLoading] = useState(false);

    const [formData, setFormData] = useState({
        email: '',
        password: '',
        fullName: '',
        role: 'cashier', // default
        permissions: {
            history: true,
            reports: false,
            products: false,
            store: false,
            users: false,
            purchases: true
        }
    });

    // Notification State
    const [showModal, setShowModal] = useState(false);
    const [modalConfig, setModalConfig] = useState({
        title: '',
        message: '',
        type: 'info' as 'info' | 'success' | 'danger' | 'warning',
        shouldGoBack: false
    });

    const handleSave = async () => {
        if (!formData.email || !formData.password || !formData.fullName) {
            setModalConfig({
                title: 'Eror',
                message: 'Mohon lengkapi semua formulir',
                type: 'warning',
                shouldGoBack: false
            });
            setShowModal(true);
            return;
        }

        if (formData.password.length < 6) {
            setModalConfig({
                title: 'Eror',
                message: 'Password minimal 6 karakter',
                type: 'warning',
                shouldGoBack: false
            });
            setShowModal(true);
            return;
        }

        setLoading(true);
        try {
            // Register user via Supabase Auth
            const { data, error } = await supabase.auth.signUp({
                email: formData.email,
                password: formData.password,
                options: {
                    data: {
                        full_name: formData.fullName,
                        role: formData.role,
                        permissions: formData.role === 'admin' ? null : formData.permissions
                    }
                }
            });

            if (error) throw error;

            if (data.user) {
                setModalConfig({
                    title: 'Sukses',
                    message: 'Pengguna baru berhasil didaftarkan. Silakan cek email untuk verifikasi (jika aktif).',
                    type: 'success',
                    shouldGoBack: true
                });
                setShowModal(true);
            }
        } catch (error: any) {
            console.error('Error adding user:', error);
            setModalConfig({
                title: 'Gagal',
                message: error.message || 'Gagal mendaftarkan pengguna',
                type: 'danger',
                shouldGoBack: false
            });
            setShowModal(true);
        } finally {
            setLoading(false);
        }
    };

    const handleModalConfirm = () => {
        setShowModal(false);
        if (modalConfig.shouldGoBack) {
            router.back();
        }
    };

    return (
        <View style={[tw`flex-1 bg-gray-50`, { paddingTop: insets.top }]}>
            {/* Header */}
            <View style={tw`bg-white px-4 py-3 flex-row items-center border-b border-gray-200 shadow-sm`}>
                <TouchableOpacity onPress={() => router.back()} style={tw`p-2 -ml-2 rounded-full hover:bg-gray-100`}>
                    <ArrowLeft size={24} color="#1f2937" />
                </TouchableOpacity>
                <Text style={tw`text-lg font-bold text-gray-900 ml-2`}>Tambah Karyawan Baru</Text>
            </View>

            <ScrollView contentContainerStyle={tw`p-4`}>
                <View style={tw`bg-white p-5 rounded-xl border border-gray-200 shadow-sm gap-4`}>

                    <View>
                        <Text style={tw`text-gray-600 mb-1 font-medium`}>Nama Lengkap</Text>
                        <View style={tw`flex-row items-center bg-gray-50 border border-gray-200 rounded-xl px-3`}>
                            <User size={20} color="#9ca3af" />
                            <TextInput
                                style={tw`flex-1 p-3 text-base text-gray-900`}
                                placeholder="Contoh: Budi Santoso"
                                value={formData.fullName}
                                onChangeText={(t) => setFormData({ ...formData, fullName: t })}
                            />
                        </View>
                    </View>

                    <View>
                        <Text style={tw`text-gray-600 mb-1 font-medium`}>Email Login</Text>
                        <View style={tw`flex-row items-center bg-gray-50 border border-gray-200 rounded-xl px-3`}>
                            <Mail size={20} color="#9ca3af" />
                            <TextInput
                                style={tw`flex-1 p-3 text-base text-gray-900`}
                                placeholder="nama@email.com"
                                keyboardType="email-address"
                                autoCapitalize="none"
                                value={formData.email}
                                onChangeText={(t) => setFormData({ ...formData, email: t })}
                            />
                        </View>
                    </View>

                    <View>
                        <Text style={tw`text-gray-600 mb-1 font-medium`}>Password</Text>
                        <View style={tw`flex-row items-center bg-gray-50 border border-gray-200 rounded-xl px-3`}>
                            <Lock size={20} color="#9ca3af" />
                            <TextInput
                                style={tw`flex-1 p-3 text-base text-gray-900`}
                                placeholder="Minimal 6 karakter"
                                secureTextEntry
                                value={formData.password}
                                onChangeText={(t) => setFormData({ ...formData, password: t })}
                            />
                        </View>
                    </View>

                    <View>
                        <Text style={tw`text-gray-600 mb-1 font-medium`}>Peran (Role)</Text>
                        <View style={tw`flex-row gap-3`}>
                            <TouchableOpacity
                                onPress={() => setFormData({ ...formData, role: 'cashier' })}
                                style={[
                                    tw`flex-1 py-3 px-4 rounded-xl border flex-row items-center justify-center gap-2`,
                                    formData.role === 'cashier' ? tw`bg-blue-50 border-blue-500` : tw`bg-white border-gray-200`
                                ]}
                            >
                                <View style={[tw`w-4 h-4 rounded-full border items-center justify-center`, formData.role === 'cashier' ? tw`border-blue-600` : tw`border-gray-300`]}>
                                    {formData.role === 'cashier' && <View style={tw`w-2 h-2 rounded-full bg-blue-600`} />}
                                </View>
                                <Text style={[tw`font-medium`, formData.role === 'cashier' ? tw`text-blue-700` : tw`text-gray-600`]}>Kasir</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                onPress={() => setFormData({ ...formData, role: 'admin' })}
                                style={[
                                    tw`flex-1 py-3 px-4 rounded-xl border flex-row items-center justify-center gap-2`,
                                    formData.role === 'admin' ? tw`bg-blue-50 border-blue-500` : tw`bg-white border-gray-200`
                                ]}
                            >
                                <View style={[tw`w-4 h-4 rounded-full border items-center justify-center`, formData.role === 'admin' ? tw`border-blue-600` : tw`border-gray-300`]}>
                                    {formData.role === 'admin' && <View style={tw`w-2 h-2 rounded-full bg-blue-600`} />}
                                </View>
                                <Text style={[tw`font-medium`, formData.role === 'admin' ? tw`text-blue-700` : tw`text-gray-600`]}>Administrator</Text>
                            </TouchableOpacity>
                        </View>

                        {formData.role === 'cashier' && (
                            <View style={tw`mt-4 bg-gray-50 p-4 rounded-xl border border-gray-100`}>
                                <Text style={tw`text-sm font-bold text-gray-700 mb-3`}>Izin Akses Kasir</Text>
                                <View style={tw`flex-row flex-wrap gap-2`}>
                                    {[
                                        { id: 'history', label: 'Riwayat' },
                                        { id: 'reports', label: 'Laporan' },
                                        { id: 'products', label: 'Produk' },
                                        { id: 'store', label: 'Toko' },
                                        { id: 'users', label: 'User' },
                                        { id: 'purchases', label: 'Stok' },
                                    ].map((item) => (
                                        <TouchableOpacity
                                            key={item.id}
                                            onPress={() => setFormData({
                                                ...formData,
                                                permissions: { ...formData.permissions, [item.id]: !(formData.permissions as any)[item.id] }
                                            })}
                                            style={[
                                                tw`flex-row items-center gap-1.5 px-3 py-2 rounded-lg border`,
                                                (formData.permissions as any)[item.id] ? tw`bg-blue-100 border-blue-300` : tw`bg-white border-gray-200`
                                            ]}
                                        >
                                            <View style={[tw`w-4 h-4 rounded border items-center justify-center`, (formData.permissions as any)[item.id] ? tw`bg-blue-600 border-blue-600` : tw`bg-white border-gray-300`]}>
                                                {(formData.permissions as any)[item.id] && <Text style={tw`text-[10px] text-white font-bold`}>✓</Text>}
                                            </View>
                                            <Text style={[tw`text-xs font-medium`, (formData.permissions as any)[item.id] ? tw`text-blue-700` : tw`text-gray-500`]}>{item.label}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>
                        )}
                        <Text style={tw`text-xs text-gray-400 mt-1`}>
                            {formData.role === 'admin'
                                ? 'Administrator memiliki akses penuh ke pengaturan dan laporan.'
                                : 'Kasir hanya bisa melakukan transaksi penjualan.'}
                        </Text>
                    </View>

                    <TouchableOpacity
                        onPress={handleSave}
                        disabled={loading}
                        style={[
                            tw`py-3 rounded-xl items-center mt-4 flex-row justify-center gap-2`,
                            loading ? tw`bg-blue-400` : tw`bg-blue-600`
                        ]}
                    >
                        {loading ? (
                            <ActivityIndicator color="white" />
                        ) : (
                            <>
                                <Check size={20} color="white" />
                                <Text style={tw`text-white font-bold text-lg`}>Daftarkan</Text>
                            </>
                        )}
                    </TouchableOpacity>

                </View>

                <Text style={tw`text-center text-gray-400 text-xs mt-4 px-4`}>
                    Password default ini akan digunakan karyawan untuk login pertama kali.
                </Text>
            </ScrollView>

            <ConfirmationModal
                visible={showModal}
                title={modalConfig.title}
                message={modalConfig.message}
                type={modalConfig.type}
                confirmText="OK"
                cancelText={null}
                onConfirm={handleModalConfirm}
                onCancel={() => { }}
            />
        </View>
    );
}
