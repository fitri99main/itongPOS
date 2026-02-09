import { useState, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { Plus, User, ArrowLeft, Trash2, Pencil } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import tw from 'twrnc';
import { EditUserModal } from '../../components/EditUserModal';
import { ConfirmationModal } from '../../components/ConfirmationModal';

interface Profile {
    id: string;
    email: string;
    full_name: string;
    role: string;
    created_at: string;
}

export default function UsersScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const [loading, setLoading] = useState(true);
    const [users, setUsers] = useState<Profile[]>([]);
    const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
    const [isEditModalVisible, setIsEditModalVisible] = useState(false);
    const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);

    // Generic Status Modal
    const [statusModal, setStatusModal] = useState({
        visible: false,
        title: '',
        message: '',
        type: 'info' as 'info' | 'success' | 'danger' | 'warning'
    });

    useFocusEffect(
        useCallback(() => {
            fetchUsers();
        }, [])
    );

    const fetchUsers = async () => {
        console.log('START fetchUsers');
        setLoading(true);
        try {
            console.log('Querying supabase profiles...');
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .order('created_at', { ascending: false });

            console.log('Query result:', { data_length: data?.length, error });

            if (error) throw error;
            setUsers(data || []);
        } catch (error: any) {
            console.error('Error fetching users:', error);
            setStatusModal({
                visible: true,
                title: 'Error',
                message: 'Gagal memuat data pengguna',
                type: 'danger'
            });
        } finally {
            console.log('FINALLY fetchUsers');
            setLoading(false);
        }
    };

    const handleEdit = (user: Profile) => {
        setSelectedUser(user);
        setIsEditModalVisible(true);
    };

    const handleDelete = (user: Profile) => {
        Alert.alert(
            'Hapus Pengguna',
            `Apakah Anda yakin ingin menghapus akses untuk ${user.email}? Pengguna ini tidak akan bisa login lagi.`,
            [
                { text: 'Batal', style: 'cancel' },
                {
                    text: 'Hapus',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            const { error } = await supabase
                                .from('profiles')
                                .delete()
                                .eq('id', user.id);

                            if (error) throw error;

                            Alert.alert('Sukses', 'Pengguna berhasil dihapus.');
                            fetchUsers();
                        } catch (error: any) {
                            Alert.alert('Error', error.message || 'Gagal menghapus pengguna.');
                        }
                    }
                }
            ]
        );
    };

    const confirmDelete = async () => {
        if (!selectedUser) return;

        try {
            const { error } = await supabase
                .from('profiles')
                .delete()
                .eq('id', selectedUser.id);

            if (error) throw error;

            setIsDeleteModalVisible(false);
            setStatusModal({
                visible: true,
                title: 'Sukses',
                message: 'Pengguna berhasil dihapus.',
                type: 'success'
            });
            fetchUsers();
        } catch (error: any) {
            console.error('Delete error:', error);
            setIsDeleteModalVisible(false);
            setStatusModal({
                visible: true,
                title: 'Error',
                message: error.message || 'Gagal menghapus pengguna.',
                type: 'danger'
            });
        }
    };

    return (
        <View style={[tw`flex-1 bg-gray-50`, { paddingTop: insets.top }]}>
            {/* Header */}
            <View style={tw`bg-white px-4 py-3 flex-row items-center justify-between border-b border-gray-200 shadow-sm`}>
                <View style={tw`flex-row items-center`}>
                    <TouchableOpacity onPress={() => router.back()} style={tw`p-2 -ml-2 rounded-full hover:bg-gray-100`}>
                        <ArrowLeft size={24} color="#1f2937" />
                    </TouchableOpacity>
                    <Text style={tw`text-lg font-bold text-gray-900 ml-2`}>Kelola Pengguna</Text>
                </View>
                <TouchableOpacity
                    onPress={() => router.push('/users/add' as any)}
                    style={tw`bg-blue-600 p-2 rounded-full`}
                >
                    <Plus size={20} color="white" />
                </TouchableOpacity>
            </View>

            {loading ? (
                <View style={tw`flex-1 items-center justify-center`}>
                    <ActivityIndicator size="large" color="#2563eb" />
                </View>
            ) : (
                <FlatList
                    data={users}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={tw`p-4`}
                    ListEmptyComponent={
                        <View style={tw`items-center justify-center py-20`}>
                            <User size={48} color="#9ca3af" />
                            <Text style={tw`text-gray-500 mt-4`}>Belum ada pengguna lain</Text>
                        </View>
                    }
                    renderItem={({ item }) => (
                        <View style={tw`bg-white p-4 rounded-xl mb-3 border border-gray-200 shadow-sm flex-row items-center justify-between`}>
                            <View style={tw`flex-row items-center gap-3 flex-1`}>
                                <View style={tw`bg-blue-50 w-10 h-10 rounded-full items-center justify-center`}>
                                    <Text style={tw`text-blue-600 font-bold text-lg`}>
                                        {item.full_name ? item.full_name.charAt(0).toUpperCase() : '?'}
                                    </Text>
                                </View>
                                <View style={tw`flex-1`}>
                                    <Text style={tw`font-bold text-gray-900 text-base`} numberOfLines={1}>
                                        {item.full_name || 'Tanpa Nama'}
                                    </Text>
                                    <Text style={tw`text-gray-500 text-xs`} numberOfLines={1}>{item.email}</Text>
                                    <View style={tw`bg-gray-100 self-start px-2 py-0.5 rounded-md mt-1`}>
                                        <Text style={tw`text-xs text-gray-600 capitalize`}>{item.role}</Text>
                                    </View>
                                </View>
                            </View>

                            <View style={tw`flex-row gap-2`}>
                                <TouchableOpacity
                                    onPress={() => handleEdit(item)}
                                    style={tw`p-2 bg-gray-100 rounded-full border border-gray-200`}
                                >
                                    <Pencil size={18} color="#4b5563" />
                                </TouchableOpacity>
                                <TouchableOpacity
                                    onPress={() => handleDelete(item)}
                                    style={tw`p-2 bg-red-50 rounded-full border border-red-100`}
                                >
                                    <Trash2 size={18} color="#dc2626" />
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}
                />
            )}

            <EditUserModal
                visible={isEditModalVisible}
                user={selectedUser}
                onClose={() => setIsEditModalVisible(false)}
                onSave={fetchUsers}
            />

            <ConfirmationModal
                visible={isDeleteModalVisible}
                title="Hapus Pengguna?"
                message={`Apakah Anda yakin ingin menghapus akses untuk ${selectedUser?.email || 'pengguna ini'}? Pengguna ini tidak akan bisa login lagi.`}
                confirmText="Ya, Hapus"
                cancelText="Batal"
                type="danger"
                onCancel={() => setIsDeleteModalVisible(false)}
                onConfirm={confirmDelete}
            />

            {/* Generic Status Modal */}
            <ConfirmationModal
                visible={statusModal.visible}
                title={statusModal.title}
                message={statusModal.message}
                type={statusModal.type}
                confirmText="OK"
                cancelText={null}
                onConfirm={() => setStatusModal({ ...statusModal, visible: false })}
                onCancel={() => { }}
            />

        </View>
    );
}
