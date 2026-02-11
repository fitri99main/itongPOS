import { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, TextInput, Modal, ScrollView, Linking } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../lib/supabase';
import { ArrowLeft, Plus, Search, Edit2, Trash2, X, Users, Phone, Mail, MapPin, AlertCircle } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import tw from 'twrnc';

import { ConfirmationModal } from '../components/ConfirmationModal';

interface Customer {
    id: string;
    name: string;
    phone: string | null;
    email: string | null;
    address: string | null;
}

export default function CustomersScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [tableMissing, setTableMissing] = useState(false);

    // Modal State
    const [modalVisible, setModalVisible] = useState(false);
    const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
    const [formData, setFormData] = useState({
        name: '',
        phone: '',
        email: '',
        address: ''
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
        fetchCustomers();
    }, []);

    const fetchCustomers = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('customers')
                .select('*')
                .order('name');

            if (error) {
                if (error.code === '42P01' || error.code === 'PGRST205') {
                    // Table missing
                    console.log('Customers table missing');
                    setTableMissing(true);
                    setCustomers([]);
                } else {
                    throw error;
                }
            } else {
                setTableMissing(false);
                setCustomers(data || []);
            }
        } catch (error: any) {
            console.error('Error fetching customers:', error);
            setStatusModalConfig({
                title: 'Eror',
                message: 'Gagal memuat data pelanggan',
                type: 'danger',
                onConfirm: () => setShowStatusModal(false)
            });
            setShowStatusModal(true);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (tableMissing) {
            setStatusModalConfig({
                title: 'Fitur Belum Tersedia',
                message: 'Tabel database customers belum dibuat. Hubungi developer.',
                type: 'warning',
                onConfirm: () => setShowStatusModal(false)
            });
            setShowStatusModal(true);
            return;
        }

        if (!formData.name) {
            setStatusModalConfig({
                title: 'Eror',
                message: 'Nama pelanggan wajib diisi',
                type: 'warning',
                onConfirm: () => setShowStatusModal(false)
            });
            setShowStatusModal(true);
            return;
        }

        const payload = {
            name: formData.name,
            phone: formData.phone || null,
            email: formData.email || null,
            address: formData.address || null
        };

        try {
            if (editingCustomer) {
                const { error } = await supabase
                    .from('customers')
                    .update(payload)
                    .eq('id', editingCustomer.id);
                if (error) throw error;
                setStatusModalConfig({
                    title: 'Sukses',
                    message: 'Data pelanggan diperbarui',
                    type: 'success',
                    onConfirm: () => setShowStatusModal(false)
                });
            } else {
                const { error } = await supabase
                    .from('customers')
                    .insert([payload]);
                if (error) throw error;
                setStatusModalConfig({
                    title: 'Sukses',
                    message: 'Pelanggan ditambahkan',
                    type: 'success',
                    onConfirm: () => setShowStatusModal(false)
                });
            }

            setModalVisible(false);
            fetchCustomers();
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
            title: 'Hapus Pelanggan',
            message: 'Apakah Anda yakin? Data ini tidak dapat dikembalikan.',
            type: 'danger',
            onConfirm: async () => {
                setShowStatusModal(false);
                try {
                    const { error } = await supabase.from('customers').delete().eq('id', id);
                    if (error) throw error;
                    fetchCustomers();
                } catch (error) {
                    setTimeout(() => {
                        setStatusModalConfig({
                            title: 'Eror',
                            message: 'Gagal menghapus data',
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

    const openModal = (customer?: Customer) => {
        if (tableMissing) {
            setStatusModalConfig({
                title: 'Fitur Belum Tersedia',
                message: 'Database pelanggan belum dikonfigurasi.',
                type: 'warning',
                onConfirm: () => setShowStatusModal(false)
            });
            setShowStatusModal(true);
            return;
        }
        if (customer) {
            setEditingCustomer(customer);
            setFormData({
                name: customer.name,
                phone: customer.phone || '',
                email: customer.email || '',
                address: customer.address || ''
            });
        } else {
            resetForm();
        }
        setModalVisible(true);
    };

    const resetForm = () => {
        setEditingCustomer(null);
        setFormData({ name: '', phone: '', email: '', address: '' });
    };

    const handleCall = (phone: string) => {
        Linking.openURL(`tel:${phone}`);
    };

    const filteredCustomers = customers.filter(c =>
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.phone && c.phone.includes(searchQuery))
    );

    return (
        <View style={[tw`flex-1 bg-gray-50`, { paddingTop: insets.top }]}>
            {/* Header */}
            <View style={tw`bg-white px-4 py-3 flex-row items-center justify-between border-b border-gray-200 shadow-sm`}>
                <View style={tw`flex-row items-center`}>
                    <TouchableOpacity onPress={() => router.back()} style={tw`p-2 -ml-2 rounded-full hover:bg-gray-100`}>
                        <ArrowLeft size={24} color="#1f2937" />
                    </TouchableOpacity>
                    <Text style={tw`text-lg font-bold text-gray-900 ml-2`}>Data Pelanggan</Text>
                </View>
                {!tableMissing && (
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
                        placeholder="Cari nama atau no. telepon..."
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
                    data={filteredCustomers}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={tw`p-4 pb-20`}
                    ListEmptyComponent={
                        <View style={tw`items-center justify-center py-20`}>
                            {tableMissing ? (
                                <>
                                    <AlertCircle size={48} color="#f59e0b" />
                                    <Text style={tw`text-gray-900 font-bold mt-4`}>Fitur Belum Aktif</Text>
                                    <Text style={tw`text-gray-500 text-center px-8 mt-2`}>
                                        Tabel 'customers' belum ada di database. Silakan hubungi tim teknis untuk mengaktifkan fitur ini.
                                    </Text>
                                </>
                            ) : (
                                <>
                                    <Users size={48} color="#9ca3af" />
                                    <Text style={tw`text-gray-500 mt-4`}>Belum ada data pelanggan</Text>
                                </>
                            )}
                        </View>
                    }
                    renderItem={({ item }) => (
                        <View style={tw`bg-white p-4 rounded-xl mb-3 border border-gray-200 shadow-sm`}>
                            {/* ... same as before ... */}
                            <View style={tw`flex-row justify-between items-start mb-3`}>
                                <View style={tw`flex-row items-center gap-3`}>
                                    <View style={tw`h-10 w-10 bg-blue-100 rounded-full items-center justify-center`}>
                                        <Text style={tw`text-blue-700 font-bold text-lg`}>
                                            {item.name.charAt(0).toUpperCase()}
                                        </Text>
                                    </View>
                                    <View>
                                        <Text style={tw`font-bold text-gray-900 text-base`}>{item.name}</Text>
                                        <Text style={tw`text-xs text-gray-500`}>ID: {item.id.substring(0, 6)}</Text>
                                    </View>
                                </View>
                                <View style={tw`flex-row gap-2`}>
                                    <TouchableOpacity onPress={() => openModal(item)} style={tw`p-2 bg-gray-50 rounded-lg`}>
                                        <Edit2 size={18} color="#2563eb" />
                                    </TouchableOpacity>
                                    <TouchableOpacity onPress={() => handleDelete(item.id)} style={tw`p-2 bg-red-50 rounded-lg`}>
                                        <Trash2 size={18} color="#dc2626" />
                                    </TouchableOpacity>
                                </View>
                            </View>

                            <View style={tw`bg-gray-50 p-3 rounded-lg flex-col gap-2`}>
                                {item.phone && (
                                    <TouchableOpacity onPress={() => handleCall(item.phone!)} style={tw`flex-row items-center gap-2`}>
                                        <Phone size={14} color="#4b5563" />
                                        <Text style={tw`text-gray-700 text-sm`}>{item.phone}</Text>
                                    </TouchableOpacity>
                                )}
                                {item.email && (
                                    <View style={tw`flex-row items-center gap-2`}>
                                        <Mail size={14} color="#4b5563" />
                                        <Text style={tw`text-gray-700 text-sm`}>{item.email}</Text>
                                    </View>
                                )}
                                {item.address && (
                                    <View style={tw`flex-row items-center gap-2`}>
                                        <MapPin size={14} color="#4b5563" />
                                        <Text style={tw`text-gray-700 text-sm flex-1`}>{item.address}</Text>
                                    </View>
                                )}
                            </View>
                        </View>
                    )}
                />
            )}
            {/* Modal code remains... */}
            <Modal
                visible={modalVisible}
                animationType="slide"
                presentationStyle="pageSheet"
                onRequestClose={() => setModalVisible(false)}
            >
                <ScrollView style={tw`flex-1 bg-white`}>
                    <View style={tw`px-4 py-4 border-b border-gray-200 flex-row items-center justify-between bg-gray-50`}>
                        <Text style={tw`text-lg font-bold text-gray-900`}>
                            {editingCustomer ? 'Edit Pelanggan' : 'Tambah Pelanggan Baru'}
                        </Text>
                        <TouchableOpacity onPress={() => setModalVisible(false)} style={tw`bg-gray-200 p-2 rounded-full`}>
                            <X size={20} color="#374151" />
                        </TouchableOpacity>
                    </View>

                    <View style={tw`p-6 gap-4`}>
                        <View>
                            <Text style={tw`text-gray-700 font-medium mb-1`}>Nama Lengkap *</Text>
                            <TextInput
                                style={tw`bg-gray-50 border border-gray-200 rounded-xl p-3 text-gray-900`}
                                placeholder="Nama Pelanggan"
                                value={formData.name}
                                onChangeText={(t) => setFormData({ ...formData, name: t })}
                            />
                        </View>

                        <View>
                            <Text style={tw`text-gray-700 font-medium mb-1`}>No. Telepon</Text>
                            <TextInput
                                style={tw`bg-gray-50 border border-gray-200 rounded-xl p-3 text-gray-900`}
                                placeholder="08..."
                                keyboardType="phone-pad"
                                value={formData.phone}
                                onChangeText={(t) => setFormData({ ...formData, phone: t })}
                            />
                        </View>

                        <View>
                            <Text style={tw`text-gray-700 font-medium mb-1`}>Email</Text>
                            <TextInput
                                style={tw`bg-gray-50 border border-gray-200 rounded-xl p-3 text-gray-900`}
                                placeholder="email@contoh.com"
                                keyboardType="email-address"
                                autoCapitalize="none"
                                value={formData.email}
                                onChangeText={(t) => setFormData({ ...formData, email: t })}
                            />
                        </View>

                        <View>
                            <Text style={tw`text-gray-700 font-medium mb-1`}>Alamat</Text>
                            <TextInput
                                style={tw`bg-gray-50 border border-gray-200 rounded-xl p-3 text-gray-900 h-24`}
                                placeholder="Alamat lengkap..."
                                multiline
                                textAlignVertical="top"
                                value={formData.address}
                                onChangeText={(t) => setFormData({ ...formData, address: t })}
                            />
                        </View>

                        <TouchableOpacity
                            onPress={handleSave}
                            style={tw`bg-blue-600 py-4 rounded-xl items-center shadow-md mt-4`}
                        >
                            <Text style={tw`text-white font-bold text-lg`}>Simpan Data</Text>
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </Modal>

            <ConfirmationModal
                visible={showStatusModal}
                title={statusModalConfig.title}
                message={statusModalConfig.message}
                type={statusModalConfig.type}
                confirmText={statusModalConfig.type === 'danger' && statusModalConfig.title === 'Hapus Pelanggan' ? 'Hapus' : 'OK'}
                cancelText={statusModalConfig.type === 'danger' && statusModalConfig.title.includes('Hapus') ? 'Batal' : null}
                onConfirm={statusModalConfig.onConfirm}
                onCancel={() => setShowStatusModal(false)}
            />
        </View >
    );
}
