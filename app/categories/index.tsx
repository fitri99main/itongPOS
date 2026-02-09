import { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, Alert, TextInput, Modal, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { Category } from '../../types';
import { ArrowLeft, Plus, Search, Edit2, Trash2, X, Tag } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import tw from 'twrnc';

import { ConfirmationModal } from '../../components/ConfirmationModal';

export default function CategoriesScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { role } = useAuth();
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    // Form Modal State
    const [modalVisible, setModalVisible] = useState(false);
    const [editingCategory, setEditingCategory] = useState<Category | null>(null);
    const [formData, setFormData] = useState({
        name: '',
        icon: ''
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
        fetchCategories();
    }, []);

    const fetchCategories = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('categories')
                .select('*')
                .order('name');

            if (error) throw error;
            setCategories(data || []);
        } catch (error) {
            console.error('Error fetching categories:', error);
            // Alert.alert('Eror', 'Gagal memuat kategori');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!formData.name) {
            setStatusModalConfig({
                title: 'Eror',
                message: 'Nama kategori wajib diisi',
                type: 'warning',
                onConfirm: () => setShowStatusModal(false)
            });
            setShowStatusModal(true);
            return;
        }

        const payload = {
            name: formData.name,
            icon: formData.icon || null
        };

        try {
            if (editingCategory) {
                const { error } = await supabase
                    .from('categories')
                    .update(payload)
                    .eq('id', editingCategory.id);
                if (error) throw error;
                setStatusModalConfig({
                    title: 'Sukses',
                    message: 'Kategori diperbarui',
                    type: 'success',
                    onConfirm: () => setShowStatusModal(false)
                });
            } else {
                const { error } = await supabase
                    .from('categories')
                    .insert([payload]);
                if (error) throw error;
                setStatusModalConfig({
                    title: 'Sukses',
                    message: 'Kategori ditambahkan',
                    type: 'success',
                    onConfirm: () => setShowStatusModal(false)
                });
            }

            setModalVisible(false);
            fetchCategories();
            resetForm();
            setShowStatusModal(true);
        } catch (error: any) {
            setStatusModalConfig({
                title: 'Eror',
                message: error.message,
                type: 'danger',
                onConfirm: () => setShowStatusModal(false)
            });
            setShowStatusModal(true);
        }
    };

    const handleDelete = (id: string) => {
        setStatusModalConfig({
            title: 'Hapus Kategori',
            message: 'Apakah Anda yakin? Produk dalam kategori ini mungkin akan kehilangan referensinya.',
            type: 'danger',
            onConfirm: async () => {
                setShowStatusModal(false);
                try {
                    const { error } = await supabase.from('categories').delete().eq('id', id);
                    if (error) throw error;
                    fetchCategories();
                } catch (error) {
                    setTimeout(() => {
                        setStatusModalConfig({
                            title: 'Eror',
                            message: 'Gagal menghapus kategori',
                            type: 'danger',
                            onConfirm: () => setShowStatusModal(false)
                        });
                        setShowStatusModal(true);
                    }, 500);
                }
            }
        });
        setShowStatusModal(true);
    };

    const openModal = (category?: Category) => {
        if (category) {
            setEditingCategory(category);
            setFormData({
                name: category.name,
                icon: category.icon || ''
            });
        } else {
            resetForm();
        }
        setModalVisible(true);
    };

    const resetForm = () => {
        setEditingCategory(null);
        setFormData({ name: '', icon: '' });
    };

    const filteredCategories = categories.filter(c =>
        c.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <View style={[tw`flex-1 bg-gray-50`, { paddingTop: insets.top }]}>
            {/* Header */}
            <View style={tw`bg-white px-4 py-3 flex-row items-center justify-between border-b border-gray-200 shadow-sm`}>
                <View style={tw`flex-row items-center`}>
                    <TouchableOpacity onPress={() => router.back()} style={tw`p-2 -ml-2 rounded-full hover:bg-gray-100`}>
                        <ArrowLeft size={24} color="#1f2937" />
                    </TouchableOpacity>
                    <Text style={tw`text-lg font-bold text-gray-900 ml-2`}>Kelola Kategori</Text>
                </View>
                {role === 'admin' && (
                    <TouchableOpacity
                        onPress={() => openModal()}
                        style={tw`bg-blue-600 p-2 rounded-lg flex-row items-center gap-2 px-3`}
                    >
                        <Plus size={20} color="white" />
                        <Text style={tw`text-white font-bold text-sm`}>Tambah</Text>
                    </TouchableOpacity>
                )}
            </View>

            {/* Search */}
            <View style={tw`p-4 bg-white border-b border-gray-100`}>
                <View style={tw`flex-row items-center bg-gray-100 px-3 py-2 rounded-xl`}>
                    <Search size={20} color="#9ca3af" />
                    <TextInput
                        placeholder="Cari kategori..."
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
                    data={filteredCategories}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={tw`p-4 pb-20`}
                    ListEmptyComponent={
                        <View style={tw`items-center justify-center py-20`}>
                            <Tag size={48} color="#9ca3af" />
                            <Text style={tw`text-gray-500 mt-4`}>Belum ada kategori</Text>
                        </View>
                    }
                    renderItem={({ item }) => (
                        <View style={tw`bg-white p-4 rounded-xl mb-3 border border-gray-200 shadow-sm flex-row items-center justify-between`}>
                            <View style={tw`flex-row items-center gap-3`}>
                                <View style={tw`h-10 w-10 bg-blue-100 rounded-lg items-center justify-center`}>
                                    {item.icon ? (
                                        <Text style={tw`text-xl`}>{item.icon}</Text>
                                    ) : (
                                        <Tag size={20} color="#2563eb" />
                                    )}
                                </View>
                                <Text style={tw`font-bold text-gray-900 text-base`}>{item.name}</Text>
                            </View>

                            <View style={tw`flex-row gap-2`}>
                                {role === 'admin' && (
                                    <>
                                        <TouchableOpacity onPress={() => openModal(item)} style={tw`p-2 bg-gray-50 rounded-lg`}>
                                            <Edit2 size={18} color="#2563eb" />
                                        </TouchableOpacity>
                                        <TouchableOpacity onPress={() => handleDelete(item.id)} style={tw`p-2 bg-red-50 rounded-lg`}>
                                            <Trash2 size={18} color="#dc2626" />
                                        </TouchableOpacity>
                                    </>
                                )}
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
                            {editingCategory ? 'Edit Kategori' : 'Tambah Kategori'}
                        </Text>
                        <TouchableOpacity onPress={() => setModalVisible(false)} style={tw`bg-gray-200 p-2 rounded-full`}>
                            <X size={20} color="#374151" />
                        </TouchableOpacity>
                    </View>

                    <ScrollView contentContainerStyle={tw`p-6`}>
                        <View style={tw`mb-4`}>
                            <Text style={tw`text-gray-700 font-medium mb-1`}>Nama Kategori</Text>
                            <TextInput
                                style={tw`bg-gray-50 border border-gray-200 rounded-xl p-3 text-gray-900`}
                                placeholder="Contoh: Minuman"
                                value={formData.name}
                                onChangeText={(t) => setFormData({ ...formData, name: t })}
                            />
                        </View>

                        <View style={tw`mb-6`}>
                            <Text style={tw`text-gray-700 font-medium mb-1`}>Ikon (Opsional)</Text>
                            <TextInput
                                style={tw`bg-gray-50 border border-gray-200 rounded-xl p-3 text-gray-900`}
                                placeholder="Emoji (e.g. ☕)"
                                value={formData.icon}
                                onChangeText={(t) => setFormData({ ...formData, icon: t })}
                            />
                            <Text style={tw`text-xs text-gray-500 mt-1`}>Gunakan emoji untuk tampilan yang lebih menarik</Text>
                        </View>

                        <TouchableOpacity
                            onPress={handleSave}
                            style={tw`bg-blue-600 py-4 rounded-xl items-center shadow-md`}
                        >
                            <Text style={tw`text-white font-bold text-lg`}>Simpan Kategori</Text>
                        </TouchableOpacity>
                    </ScrollView>
                </KeyboardAvoidingView>
            </Modal>

            <ConfirmationModal
                visible={showStatusModal}
                title={statusModalConfig.title}
                message={statusModalConfig.message}
                type={statusModalConfig.type}
                confirmText="OK"
                cancelText={statusModalConfig.type === 'danger' && statusModalConfig.title.includes('Hapus') ? 'Batal' : null}
                onConfirm={statusModalConfig.onConfirm}
                onCancel={() => setShowStatusModal(false)}
            />
        </View >
    );
}
