import { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, Image, ActivityIndicator, Alert, TextInput, Modal, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { Category, Product } from '../../types';
import { ArrowLeft, Plus, Search, Edit2, Trash2, X, Package, Tag } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';

import tw from 'twrnc';

import { ConfirmationModal } from '../../components/ConfirmationModal';

export default function ProductsScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { role } = useAuth();
    const [products, setProducts] = useState<Product[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    // Form Modal State
    const [modalVisible, setModalVisible] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);
    const [formData, setFormData] = useState({
        name: '',
        price: '',
        stock: '',
        category_id: '',
        description: '',
        image_url: ''
    });
    const [uploading, setUploading] = useState(false);

    // Notification Modal State
    const [showStatusModal, setShowStatusModal] = useState(false);
    const [statusModalConfig, setStatusModalConfig] = useState({
        title: '',
        message: '',
        type: 'info' as 'info' | 'success' | 'danger' | 'warning',
        onConfirm: () => { }
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [productsRes, categoriesRes] = await Promise.all([
                supabase.from('products').select('*').order('name'),
                supabase.from('categories').select('*').order('name')
            ]);

            if (productsRes.error) throw productsRes.error;
            if (categoriesRes.error) throw categoriesRes.error;

            setProducts(productsRes.data || []);
            setCategories(categoriesRes.data || []);
        } catch (error) {
            console.error('Error fetching data:', error);
            Alert.alert('Error', 'Gagal memuat data');
        } finally {
            setLoading(false);
        }
    };

    const pickImage = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.5,
        });

        if (!result.canceled) {
            setFormData({ ...formData, image_url: result.assets[0].uri });
        }
    };

    const uploadImage = async (uri: string): Promise<string | null> => {
        try {
            if (!uri.startsWith('file://')) return uri; // Already a remote URL

            setUploading(true);

            const fileExt = uri.split('.').pop()?.toLowerCase() || 'jpg';
            const fileName = `${Date.now()}.${fileExt}`;
            const filePath = `${fileName}`;

            const formData = new FormData();
            formData.append('file', {
                uri: uri,
                name: fileName,
                type: `image/${fileExt}`
            } as any);

            const { error: uploadError } = await supabase.storage
                .from('products')
                .upload(filePath, formData, {
                    contentType: `image/${fileExt}`,
                    upsert: true
                });

            if (uploadError) throw uploadError;

            const { data } = supabase.storage.from('products').getPublicUrl(filePath);
            return data.publicUrl;
        } catch (error: any) {
            console.log('Error details:', error);
            // Handle standard JS errors which don't stringify well
            const message = error.message || (typeof error === 'object' ? JSON.stringify(error) : String(error));
            setStatusModalConfig({
                title: 'Upload Gagal',
                message: `Step: ${uploading ? 'Uploading' : 'Reading File'}\nDetail: ${message}`,
                type: 'danger',
                onConfirm: () => setShowStatusModal(false)
            });
            setShowStatusModal(true);
            return null;
        } finally {
            setUploading(false);
        }
    };

    const handleSave = async () => {
        if (!formData.name || !formData.price) {
            setStatusModalConfig({
                title: 'Eror',
                message: 'Nama dan Harga wajib diisi',
                type: 'warning',
                onConfirm: () => setShowStatusModal(false)
            });
            setShowStatusModal(true);
            return;
        }

        let imageUrl = formData.image_url;

        // Upload image if it's a local file
        if (imageUrl && imageUrl.startsWith('file://')) {
            const uploadedUrl = await uploadImage(imageUrl);
            if (!uploadedUrl) return; // Stop if upload failed
            imageUrl = uploadedUrl;
        }

        const payload = {
            name: formData.name,
            price: parseFloat(formData.price),
            stock: parseInt(formData.stock) || 0,
            description: formData.description,
            image_url: imageUrl || (editingProduct?.image_url || null),
            category_id: formData.category_id || null
        };

        try {
            if (editingProduct) {
                const { error } = await supabase
                    .from('products')
                    .update(payload)
                    .eq('id', editingProduct.id);
                if (error) throw error;
                setStatusModalConfig({
                    title: 'Sukses',
                    message: 'Produk diperbarui',
                    type: 'success',
                    onConfirm: () => setShowStatusModal(false)
                });
            } else {
                const { error } = await supabase
                    .from('products')
                    .insert([payload]);
                if (error) throw error;
                setStatusModalConfig({
                    title: 'Sukses',
                    message: 'Produk ditambahkan',
                    type: 'success',
                    onConfirm: () => setShowStatusModal(false)
                });
            }

            setModalVisible(false);
            fetchData();
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
            title: 'Hapus Produk',
            message: 'Apakah Anda yakin ingin menghapus produk ini?',
            type: 'danger',
            onConfirm: async () => {
                setShowStatusModal(false);
                try {
                    const { error } = await supabase.from('products').delete().eq('id', id);
                    if (error) throw error;
                    fetchData();
                } catch (error) {
                    // Show error modal if delete fails
                    setTimeout(() => {
                        setStatusModalConfig({
                            title: 'Eror',
                            message: 'Gagal menghapus produk',
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

    const openModal = (product?: Product) => {
        if (product) {
            setEditingProduct(product);
            setFormData({
                name: product.name,
                price: product.price.toString(),
                stock: product.stock.toString(),
                category_id: product.category_id,
                description: product.description || '',
                image_url: product.image_url || ''
            });
        } else {
            resetForm();
        }
        setModalVisible(true);
    };

    const resetForm = () => {
        setEditingProduct(null);
        setFormData({ name: '', price: '', stock: '', category_id: '', description: '', image_url: '' });
    };

    const filteredProducts = products.filter(p =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <View style={[tw`flex-1 bg-gray-50`, { paddingTop: insets.top }]}>
            {/* Header */}
            <View style={tw`bg-white px-4 py-3 flex-row items-center justify-between border-b border-gray-200 shadow-sm`}>
                <View style={tw`flex-row items-center`}>
                    <TouchableOpacity onPress={() => router.back()} style={tw`p-2 -ml-2 rounded-full hover:bg-gray-100`}>
                        <ArrowLeft size={24} color="#1f2937" />
                    </TouchableOpacity>
                    <Text style={tw`text-lg font-bold text-gray-900 ml-2`}>Kelola Produk</Text>
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
                        placeholder="Cari nama produk..."
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
                    data={filteredProducts}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={tw`p-4 pb-20`}
                    renderItem={({ item }) => (
                        <View style={tw`bg-white p-4 rounded-xl mb-3 border border-gray-200 shadow-sm flex-row gap-4`}>
                            <View style={tw`h-16 w-16 bg-gray-100 rounded-lg overflow-hidden items-center justify-center`}>
                                {item.image_url ? (
                                    <Image source={{ uri: item.image_url }} style={tw`w-full h-full`} resizeMode="cover" />
                                ) : (
                                    <Package size={24} color="#9ca3af" />
                                )}
                            </View>

                            <View style={tw`flex-1 justify-between`}>
                                <View>
                                    <Text style={tw`font-bold text-gray-900`}>{item.name}</Text>
                                    <Text style={tw`text-blue-600 font-bold`}>Rp {item.price.toLocaleString('id-ID')}</Text>
                                </View>
                                <Text style={tw`text-xs text-gray-500`}>Stok: {item.stock}</Text>
                            </View>

                            <View style={tw`justify-between`}>
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
                            {editingProduct ? 'Edit Produk' : 'Tambah Produk'}
                        </Text>
                        <TouchableOpacity onPress={() => setModalVisible(false)} style={tw`bg-gray-200 p-2 rounded-full`}>
                            <X size={20} color="#374151" />
                        </TouchableOpacity>
                    </View>

                    <ScrollView contentContainerStyle={tw`p-6`}>
                        <View style={tw`mb-4 items-center`}>
                            <TouchableOpacity onPress={pickImage} style={tw`h-32 w-32 bg-gray-100 rounded-xl overflow-hidden items-center justify-center border border-gray-300 relative`}>
                                {formData.image_url ? (
                                    <Image source={{ uri: formData.image_url }} style={tw`w-full h-full`} resizeMode="cover" />
                                ) : (
                                    <View style={tw`items-center`}>
                                        <Package size={32} color="#9ca3af" />
                                        <Text style={tw`text-xs text-gray-400 mt-2`}>Pilih Gambar</Text>
                                    </View>
                                )}
                                {uploading && (
                                    <View style={tw`absolute inset-0 bg-black/30 items-center justify-center`}>
                                        <ActivityIndicator color="white" />
                                    </View>
                                )}
                            </TouchableOpacity>
                        </View>

                        <View style={tw`mb-4`}>
                            <Text style={tw`text-gray-700 font-medium mb-1`}>Nama Produk</Text>
                            <TextInput
                                style={tw`bg-gray-50 border border-gray-200 rounded-xl p-3 text-gray-900`}
                                placeholder="Contoh: Kopi Susu"
                                value={formData.name}
                                onChangeText={(t) => setFormData({ ...formData, name: t })}
                            />
                        </View>

                        <View style={tw`flex-row gap-4 mb-4`}>
                            <View style={tw`flex-1`}>
                                <Text style={tw`text-gray-700 font-medium mb-1`}>Harga</Text>
                                <TextInput
                                    style={tw`bg-gray-50 border border-gray-200 rounded-xl p-3 text-gray-900`}
                                    placeholder="0"
                                    keyboardType="numeric"
                                    value={formData.price}
                                    onChangeText={(t) => setFormData({ ...formData, price: t })}
                                />
                            </View>
                            <View style={tw`flex-1`}>
                                <Text style={tw`text-gray-700 font-medium mb-1`}>Stok</Text>
                                <TextInput
                                    style={tw`bg-gray-50 border border-gray-200 rounded-xl p-3 text-gray-900`}
                                    placeholder="0"
                                    keyboardType="numeric"
                                    value={formData.stock}
                                    onChangeText={(t) => setFormData({ ...formData, stock: t })}
                                />
                            </View>
                        </View>

                        <View style={tw`mb-4`}>
                            <Text style={tw`text-gray-700 font-medium mb-2`}>Kategori</Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                <View style={tw`flex-row gap-2`}>
                                    {categories.map((cat) => (
                                        <TouchableOpacity
                                            key={cat.id}
                                            onPress={() => setFormData({ ...formData, category_id: cat.id })}
                                            style={[
                                                tw`px-4 py-2 rounded-full border mb-1`,
                                                formData.category_id === cat.id
                                                    ? tw`bg-blue-600 border-blue-600`
                                                    : tw`bg-white border-gray-300`
                                            ]}
                                        >
                                            <Text
                                                style={[
                                                    tw`font-medium`,
                                                    formData.category_id === cat.id
                                                        ? tw`text-white`
                                                        : tw`text-gray-700`
                                                ]}
                                            >
                                                {cat.icon ? `${cat.icon} ` : ''}
                                                {cat.name}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </ScrollView>
                        </View>

                        <View style={tw`mb-6`}>
                            <Text style={tw`text-gray-700 font-medium mb-1`}>Deskripsi</Text>
                            <TextInput
                                style={tw`bg-gray-50 border border-gray-200 rounded-xl p-3 text-gray-900 h-24`}
                                placeholder="Deskripsi produk..."
                                multiline
                                textAlignVertical="top"
                                value={formData.description}
                                onChangeText={(t) => setFormData({ ...formData, description: t })}
                            />
                        </View>

                        <TouchableOpacity
                            onPress={handleSave}
                            style={tw`bg-blue-600 py-4 rounded-xl items-center shadow-md`}
                        >
                            <Text style={tw`text-white font-bold text-lg`}>Simpan Produk</Text>
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
        </View>
    );
}
