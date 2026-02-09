import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { ArrowLeft, Save, ShoppingCart, User, FileText, DollarSign } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import tw from 'twrnc';

export default function AddPurchaseScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const [loading, setLoading] = useState(false);

    const [formData, setFormData] = useState({
        supplier_name: '',
        invoice_number: '',
        total_amount: '',
        description: ''
    });

    const handleSave = async () => {
        if (!formData.total_amount) {
            Alert.alert('Eror', 'Mohon isi total nominal pembelian.');
            return;
        }

        setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('User not authenticated');

            const payload = {
                user_id: user.id,
                supplier_name: formData.supplier_name,
                invoice_number: formData.invoice_number,
                total_amount: parseInt(formData.total_amount.replace(/\D/g, '')),
                description: formData.description,
                created_at: new Date().toISOString()
            };

            const { error } = await supabase
                .from('purchases')
                .insert(payload);

            if (error) throw error;

            Alert.alert('Sukses', 'Data pembelian berhasil disimpan', [
                { text: 'OK', onPress: () => router.back() }
            ]);

        } catch (error: any) {
            console.error('Error saving purchase:', error);
            Alert.alert('Gagal', `Gagal menyimpan: ${error.message || 'Database error'}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={[tw`flex-1 bg-gray-50`, { paddingTop: insets.top }]}>
            {/* Header */}
            <View style={tw`bg-white px-4 py-3 flex-row items-center border-b border-gray-200 shadow-sm`}>
                <TouchableOpacity onPress={() => router.back()} style={tw`p-2 -ml-2 rounded-full hover:bg-gray-100`}>
                    <ArrowLeft size={24} color="#1f2937" />
                </TouchableOpacity>
                <Text style={tw`text-lg font-bold text-gray-900 ml-2`}>Input Pembelian Stok</Text>
            </View>

            <ScrollView contentContainerStyle={tw`p-4`}>

                <View style={tw`bg-white rounded-xl p-4 shadow-sm border border-gray-100 mb-4`}>
                    {/* Amount Input */}
                    <Text style={tw`text-gray-500 text-sm mb-1 font-medium`}>Total Pembelian (Rp) *</Text>
                    <View style={tw`flex-row items-center border border-gray-200 rounded-lg px-3 py-3 mb-4 bg-gray-50 focus:border-blue-500`}>
                        <DollarSign size={20} color="#6b7280" />
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
                    onPress={handleSave}
                    disabled={loading}
                    style={tw`bg-blue-600 rounded-xl py-4 items-center justify-center shadow-lg ${loading ? 'opacity-70' : ''}`}
                >
                    {loading ? (
                        <ActivityIndicator color="white" />
                    ) : (
                        <View style={tw`flex-row items-center gap-2`}>
                            <Save size={20} color="white" />
                            <Text style={tw`text-white font-bold text-lg`}>Simpan Pembelian</Text>
                        </View>
                    )}
                </TouchableOpacity>

            </ScrollView>
        </View>
    );
}
