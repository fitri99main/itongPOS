import { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, Alert, TextInput, Modal, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { Table } from '../../types';
import { ArrowLeft, Plus, Search, Edit2, Trash2, X, Square } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import tw from 'twrnc';

export default function TablesScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const [tables, setTables] = useState<Table[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    // Modal State
    const [modalVisible, setModalVisible] = useState(false);
    const [editingTable, setEditingTable] = useState<Table | null>(null);
    const [formData, setFormData] = useState({
        number: '',
        capacity: '4'
    });

    useEffect(() => {
        fetchTables();
    }, []);

    const fetchTables = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('tables')
                .select('*')
                .order('number');

            if (error) throw error;
            setTables(data || []);
        } catch (error) {
            console.error('Error fetching tables:', error);
            Alert.alert('Eror', 'Gagal memuat meja');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!formData.number) {
            Alert.alert('Eror', 'Nomor meja wajib diisi');
            return;
        }

        const payload = {
            number: formData.number,
            capacity: parseInt(formData.capacity) || 4
        };

        try {
            if (editingTable) {
                const { error } = await supabase
                    .from('tables')
                    .update(payload)
                    .eq('id', editingTable.id);
                if (error) throw error;
                Alert.alert('Sukses', 'Meja diperbarui');
            } else {
                const { error } = await supabase
                    .from('tables')
                    .insert([payload]);
                if (error) throw error;
                Alert.alert('Sukses', 'Meja ditambahkan');
            }

            setModalVisible(false);
            fetchTables();
            resetForm();
        } catch (error: any) {
            Alert.alert('Eror', error.message);
        }
    };

    const handleDelete = (id: string) => {
        Alert.alert(
            'Hapus Meja',
            'Apakah Anda yakin ingin menghapus meja ini?',
            [
                { text: 'Batal', style: 'cancel' },
                {
                    text: 'Hapus',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            const { error } = await supabase.from('tables').delete().eq('id', id);
                            if (error) throw error;
                            fetchTables();
                        } catch (error) {
                            Alert.alert('Eror', 'Gagal menghapus meja');
                        }
                    }
                }
            ]
        );
    };

    const openModal = (table?: Table) => {
        if (table) {
            setEditingTable(table);
            setFormData({
                number: table.number,
                capacity: table.capacity.toString()
            });
        } else {
            resetForm();
        }
        setModalVisible(true);
    };

    const resetForm = () => {
        setEditingTable(null);
        setFormData({ number: '', capacity: '4' });
    };

    const filteredTables = tables.filter(t =>
        t.number.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <View style={[tw`flex-1 bg-gray-50`, { paddingTop: insets.top }]}>
            {/* Header */}
            <View style={tw`bg-white px-4 py-3 flex-row items-center justify-between border-b border-gray-200 shadow-sm`}>
                <View style={tw`flex-row items-center`}>
                    <TouchableOpacity onPress={() => router.back()} style={tw`p-2 -ml-2 rounded-full hover:bg-gray-100`}>
                        <ArrowLeft size={24} color="#1f2937" />
                    </TouchableOpacity>
                    <Text style={tw`text-lg font-bold text-gray-900 ml-2`}>Kelola Meja</Text>
                </View>
                <TouchableOpacity
                    onPress={() => openModal()}
                    style={tw`bg-blue-600 p-2 rounded-lg flex-row items-center gap-2 px-3`}
                >
                    <Plus size={20} color="white" />
                    <Text style={tw`text-white font-bold text-sm`}>Tambah</Text>
                </TouchableOpacity>
            </View>

            {/* Search */}
            <View style={tw`p-4 bg-white border-b border-gray-100`}>
                <View style={tw`flex-row items-center bg-gray-100 px-3 py-2 rounded-xl`}>
                    <Search size={20} color="#9ca3af" />
                    <TextInput
                        placeholder="Cari nomor meja..."
                        style={tw`flex-1 ml-2 text-gray-900`}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                </View>
            </View>

            {loading ? (
                <View style={tw`flex-1 items-center justify-center`}>
                    <ActivityIndicator size="large" color="#2563eb" />
                </View>
            ) : (
                <FlatList
                    data={filteredTables}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={tw`p-4 pb-20`}
                    numColumns={2}
                    columnWrapperStyle={tw`justify-between`}
                    ListEmptyComponent={
                        <View style={tw`items-center justify-center py-20 w-full`}>
                            <Square size={48} color="#9ca3af" />
                            <Text style={tw`text-gray-500 mt-4`}>Belum ada meja</Text>
                        </View>
                    }
                    renderItem={({ item }) => (
                        <View style={tw`bg-white p-4 rounded-xl mb-3 border border-gray-200 shadow-sm w-[48%]`}>
                            <View style={tw`items-center mb-3`}>
                                <View style={tw`h-12 w-12 bg-blue-100 rounded-lg items-center justify-center mb-2`}>
                                    <Square size={24} color="#2563eb" />
                                </View>
                                <Text style={tw`font-bold text-gray-900 text-lg`}>{item.number}</Text>
                                <Text style={tw`text-xs text-gray-500`}>{item.capacity} Orang</Text>
                            </View>

                            <View style={tw`flex-row justify-center gap-2 mt-2`}>
                                <TouchableOpacity onPress={() => openModal(item)} style={tw`p-2 bg-gray-50 rounded-lg`}>
                                    <Edit2 size={16} color="#2563eb" />
                                </TouchableOpacity>
                                <TouchableOpacity onPress={() => handleDelete(item.id)} style={tw`p-2 bg-red-50 rounded-lg`}>
                                    <Trash2 size={16} color="#dc2626" />
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}
                />
            )}

            {/* Add/Edit Modal */}
            <Modal
                visible={modalVisible}
                animationType="slide"
                presentationStyle="pageSheet"
                onRequestClose={() => setModalVisible(false)}
            >
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={tw`flex-1 bg-white`}
                >
                    <View style={tw`px-4 py-4 border-b border-gray-200 flex-row items-center justify-between bg-gray-50`}>
                        <Text style={tw`text-lg font-bold text-gray-900`}>
                            {editingTable ? 'Edit Meja' : 'Tambah Meja'}
                        </Text>
                        <TouchableOpacity onPress={() => setModalVisible(false)} style={tw`bg-gray-200 p-2 rounded-full`}>
                            <X size={20} color="#374151" />
                        </TouchableOpacity>
                    </View>

                    <ScrollView contentContainerStyle={tw`p-6`}>
                        <View style={tw`mb-4`}>
                            <Text style={tw`text-gray-700 font-medium mb-1`}>Nomor Meja</Text>
                            <TextInput
                                style={tw`bg-gray-50 border border-gray-200 rounded-xl p-3 text-gray-900`}
                                placeholder="Contoh: Meja 1 / A1"
                                value={formData.number}
                                onChangeText={(t) => setFormData({ ...formData, number: t })}
                            />
                        </View>

                        <View style={tw`mb-6`}>
                            <Text style={tw`text-gray-700 font-medium mb-1`}>Kapasitas (Orang)</Text>
                            <TextInput
                                style={tw`bg-gray-50 border border-gray-200 rounded-xl p-3 text-gray-900`}
                                placeholder="4"
                                keyboardType="numeric"
                                value={formData.capacity}
                                onChangeText={(t) => setFormData({ ...formData, capacity: t })}
                            />
                        </View>

                        <TouchableOpacity
                            onPress={handleSave}
                            style={tw`bg-blue-600 py-4 rounded-xl items-center shadow-md`}
                        >
                            <Text style={tw`text-white font-bold text-lg`}>Simpan Meja</Text>
                        </TouchableOpacity>
                    </ScrollView>
                </KeyboardAvoidingView>
            </Modal>
        </View>
    );
}
