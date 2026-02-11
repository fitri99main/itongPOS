import { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { ArrowLeft, Save, ShoppingCart, User, FileText } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import tw from 'twrnc';
import { ConfirmationModal } from '../../components/ConfirmationModal';

export default function EditPurchaseScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const insets = useSafeAreaInsets();
    const [loading, setLoading] = useState(false);
    const [fetchingData, setFetchingData] = useState(true);
    const [hasError, setHasError] = useState(false);

    // Extract ID safely (handle both string and array)
    const purchaseId = Array.isArray(params.id) ? params.id[0] : params.id;

    const [formData, setFormData] = useState({
        supplier_name: '',
        invoice_number: '',
        total_amount: '',
        description: ''
    });

    // Notification Modal State
    const [showStatusModal, setShowStatusModal] = useState(false);
    const [statusModalConfig, setStatusModalConfig] = useState({
        title: '',
        message: '',
        type: 'info' as 'info' | 'success' | 'danger' | 'warning',
        onConfirm: () => { }
    });

    useEffect(() => {
        // Safety check: ensure we have a valid ID
        if (!purchaseId || purchaseId === 'undefined' || purchaseId === 'null') {
            console.error('[EditPurchase] Invalid purchase ID:', purchaseId);
            setHasError(true);
            setFetchingData(false);
            setStatusModalConfig({
                title: 'Error',
                message: 'ID pembelian tidak valid',
                type: 'danger',
                onConfirm: () => {
                    setShowStatusModal(false);
                    router.back();
                }
            });
            setShowStatusModal(true);
            return;
        }

        fetchPurchaseData();
    }, [purchaseId]);

    const fetchPurchaseData = async () => {
        try {
            console.log('[EditPurchase] Fetching purchase with ID:', purchaseId);

            const { data, error } = await supabase
                .from('purchases')
                .select('*')
                .eq('id', purchaseId)
                .single();

            if (error) {
                console.error('[EditPurchase] Supabase error:', error);
                throw error;
            }

            if (data) {
                console.log('[EditPurchase] Data loaded successfully');
                setFormData({
                    supplier_name: data.supplier_name || '',
                    invoice_number: data.invoice_number || '',
                    total_amount: data.total_amount?.toString() || '',
                    description: data.description || ''
                });
            } else {
                throw new Error('Data tidak ditemukan');
            }
        } catch (error: any) {
            console.error('[EditPurchase] Error fetching purchase:', error);
            setHasError(true);
            setStatusModalConfig({
                title: 'Error',
                message: `Gagal memuat data: ${error?.message || 'Database error'}`,
                type: 'danger',
                onConfirm: () => {
                    setShowStatusModal(false);
                    router.back();
                }
            });
            setShowStatusModal(true);
        } finally {
            setFetchingData(false);
        }
    };

    const handleUpdate = async () => {
        if (!formData.total_amount) {
            setStatusModalConfig({
                title: 'Error',
                message: 'Mohon isi total nominal pembelian.',
                type: 'warning',
                onConfirm: () => setShowStatusModal(false)
            });
            setShowStatusModal(true);
            return;
        }

        setLoading(true);
        try {
            const payload = {
                supplier_name: formData.supplier_name,
                invoice_number: formData.invoice_number,
                total_amount: parseInt(formData.total_amount.replace(/\D/g, '')),
                description: formData.description
            };

            const { error } = await supabase
                .from('purchases')
                .update(payload)
                .eq('id', purchaseId);

            if (error) throw error;

            setStatusModalConfig({
                title: 'Sukses',
                message: 'Data pembelian berhasil diperbarui',
                type: 'success',
                onConfirm: () => {
                    setShowStatusModal(false);
                    router.back();
                }
            });
            setShowStatusModal(true);

        } catch (error: any) {
            console.error('Error updating purchase:', error);
            setStatusModalConfig({
                title: 'Gagal',
                message: `Gagal memperbarui: ${error?.message || 'Database error'}`,
                type: 'danger',
                onConfirm: () => setShowStatusModal(false)
            });
            setShowStatusModal(true);
        } finally {
            setLoading(false);
        }
    };

    if (fetchingData) {
        return (
            <View style={[tw`flex-1 bg-gray-50 items-center justify-center`, { paddingTop: insets.top }]}>
                <ActivityIndicator size="large" color="#3b82f6" />
                <Text style={tw`text-gray-500 mt-4`}>Memuat data...</Text>
            </View>
        );
    }

    if (hasError && !showStatusModal) {
        return (
            <View style={[tw`flex-1 bg-gray-50`, { paddingTop: insets.top }]}>
                <View style={tw`bg-white px-4 py-3 flex-row items-center border-b border-gray-200 shadow-sm`}>
                    <TouchableOpacity onPress={() => router.back()} style={tw`p-2 -ml-2 rounded-full`}>
                        <ArrowLeft size={24} color="#1f2937" />
                    </TouchableOpacity>
                    <Text style={tw`text-lg font-bold text-gray-900 ml-2`}>Edit Pembelian</Text>
                </View>
                <View style={tw`flex-1 items-center justify-center p-6`}>
                    <Text style={tw`text-red-600 text-lg font-bold mb-2`}>Gagal Memuat Data</Text>
                    <Text style={tw`text-gray-600 text-center mb-4`}>
                        Terjadi kesalahan saat memuat data pembelian
                    </Text>
                    <TouchableOpacity
                        onPress={() => router.back()}
                        style={tw`bg-blue-600 px-6 py-3 rounded-lg`}
                    >
                        <Text style={tw`text-white font-bold`}>Kembali</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    return (
        <View style={[tw`flex-1 bg-gray-50`, { paddingTop: insets.top }]}>
            {/* Header */}
            <View style={tw`bg-white px-4 py-3 flex-row items-center border-b border-gray-200 shadow-sm`}>
                <TouchableOpacity onPress={() => router.back()} style={tw`p-2 -ml-2 rounded-full hover:bg-gray-100`}>
                    <ArrowLeft size={24} color="#1f2937" />
                </TouchableOpacity>
                <Text style={tw`text-lg font-bold text-gray-900 ml-2`}>Edit Pembelian Stok</Text>
            </View>

            <ScrollView contentContainerStyle={tw`p-4`}>

                <View style={tw`bg-white rounded-xl p-4 shadow-sm border border-gray-100 mb-4`}>
                    {/* Amount Input */}
                    <Text style={tw`text-gray-500 text-sm mb-1 font-medium`}>Total Pembelian (Rp) *</Text>
                    <View style={tw`flex-row items-center border border-gray-200 rounded-lg px-3 py-3 mb-4 bg-gray-50 focus:border-blue-500`}>
                        <View style={tw`mr-2`}>
                            <Text style={tw`text-gray-500 font-bold`}>Rp</Text>
                        </View>
                        <TextInput
                            style={tw`flex-1 ml-2 text-lg font-bold text-gray-900`}
                            placeholder="0"
                            keyboardType="numeric"
                            value={formData.total_amount}
                            onChangeText={(text) => setFormData({ ...formData, total_amount: text })}
                        />
                    </View>

                    {/* Supplier */}
                    <Text style={tw`text-gray-500 text-sm mb-1 font-medium`}>Nama Supplier / Toko</Text>
                    <View style={tw`flex-row items-center border border-gray-200 rounded-lg px-3 py-3 mb-4`}>
                        <User size={20} color="#9ca3af" />
                        <TextInput
                            style={tw`flex-1 ml-2 text-gray-900`}
                            placeholder="Contoh: Toko Sembako Jaya"
                            value={formData.supplier_name}
                            onChangeText={(text) => setFormData({ ...formData, supplier_name: text })}
                        />
                    </View>

                    {/* Invoice Number */}
                    <Text style={tw`text-gray-500 text-sm mb-1 font-medium`}>No. Nota / Invoice</Text>
                    <View style={tw`flex-row items-center border border-gray-200 rounded-lg px-3 py-3 mb-4`}>
                        <FileText size={20} color="#9ca3af" />
                        <TextInput
                            style={tw`flex-1 ml-2 text-gray-900`}
                            placeholder="Contoh: INV-001"
                            value={formData.invoice_number}
                            onChangeText={(text) => setFormData({ ...formData, invoice_number: text })}
                        />
                    </View>

                    {/* Description */}
                    <Text style={tw`text-gray-500 text-sm mb-1 font-medium`}>Keterangan / Detail Barang</Text>
                    <View style={tw`flex-row items-start border border-gray-200 rounded-lg px-3 py-3 mb-4`}>
                        <ShoppingCart size={20} color="#9ca3af" style={{ marginTop: 2 }} />
                        <TextInput
                            style={tw`flex-1 ml-2 text-gray-900 h-20`}
                            placeholder="Contoh: Beli Kopi 5kg, Gula 10kg..."
                            multiline
                            textAlignVertical="top"
                            value={formData.description}
                            onChangeText={(text) => setFormData({ ...formData, description: text })}
                        />
                    </View>
                </View>

                <TouchableOpacity
                    onPress={handleUpdate}
                    disabled={loading}
                    style={tw`bg-blue-600 rounded-xl py-4 items-center justify-center shadow-lg ${loading ? 'opacity-70' : ''}`}
                >
                    {loading ? (
                        <ActivityIndicator color="white" />
                    ) : (
                        <View style={tw`flex-row items-center gap-2`}>
                            <Save size={20} color="white" />
                            <Text style={tw`text-white font-bold text-lg`}>Perbarui Pembelian</Text>
                        </View>
                    )}
                </TouchableOpacity>

            </ScrollView>

            <ConfirmationModal
                visible={showStatusModal}
                title={statusModalConfig.title}
                message={statusModalConfig.message}
                type={statusModalConfig.type}
                confirmText="OK"
                cancelText={null}
                onConfirm={statusModalConfig.onConfirm}
                onCancel={() => setShowStatusModal(false)}
            />
        </View>
    );
}
