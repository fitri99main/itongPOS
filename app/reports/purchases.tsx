import { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { ArrowLeft, ShoppingCart, Edit2, Trash2 } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import tw from 'twrnc';
import { ConfirmationModal } from '../../components/ConfirmationModal';

export default function PurchaseReportsScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [purchases, setPurchases] = useState<any[]>([]);

    // Delete Confirmation Modal
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

    // Status Modal
    const [showStatusModal, setShowStatusModal] = useState(false);
    const [statusModalConfig, setStatusModalConfig] = useState({
        title: '',
        message: '',
        type: 'info' as 'info' | 'success' | 'danger' | 'warning',
        onConfirm: () => { }
    });

    useEffect(() => {
        fetchPurchases();
    }, []);

    const fetchPurchases = async (isRefreshing = false) => {
        if (isRefreshing) {
            setRefreshing(true);
        } else {
            setLoading(true);
        }

        try {
            const { data, error } = await supabase
                .from('purchases')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) {
                console.log('Purchase fetch error:', error.message);
                setStatusModalConfig({
                    title: 'Error',
                    message: `Gagal memuat data: ${error.message}`,
                    type: 'danger',
                    onConfirm: () => setShowStatusModal(false)
                });
                setShowStatusModal(true);
            } else {
                setPurchases(data || []);
            }
        } catch (error) {
            console.error('Error:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = () => {
        fetchPurchases(true);
    };

    const handleEdit = (purchaseId: string) => {
        router.push(`/purchases/edit?id=${purchaseId}`);
    };

    const handleDeletePress = (purchaseId: string) => {
        setDeleteTargetId(purchaseId);
        setShowDeleteModal(true);
    };

    const handleDeleteConfirm = async () => {
        if (!deleteTargetId) return;

        setShowDeleteModal(false);
        setLoading(true);

        try {
            const { error } = await supabase
                .from('purchases')
                .delete()
                .eq('id', deleteTargetId);

            if (error) throw error;

            // Remove from local state
            setPurchases(purchases.filter(p => p.id !== deleteTargetId));

            setStatusModalConfig({
                title: 'Sukses',
                message: 'Data pembelian berhasil dihapus',
                type: 'success',
                onConfirm: () => setShowStatusModal(false)
            });
            setShowStatusModal(true);

        } catch (error: any) {
            console.error('Error deleting purchase:', error);
            setStatusModalConfig({
                title: 'Gagal',
                message: `Gagal menghapus: ${error?.message || 'Database error'}`,
                type: 'danger',
                onConfirm: () => setShowStatusModal(false)
            });
            setShowStatusModal(true);
        } finally {
            setLoading(false);
            setDeleteTargetId(null);
        }
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('id-ID', {
            day: 'numeric', month: 'long', year: 'numeric'
        });
    };

    return (
        <View style={[tw`flex-1 bg-gray-50`, { paddingTop: insets.top }]}>
            {/* Header */}
            <View style={tw`bg-white px-4 py-3 flex-row items-center border-b border-gray-200 shadow-sm`}>
                <TouchableOpacity onPress={() => router.back()} style={tw`p-2 -ml-2 rounded-full hover:bg-gray-100`}>
                    <ArrowLeft size={24} color="#1f2937" />
                </TouchableOpacity>
                <Text style={tw`text-lg font-bold text-gray-900 ml-2`}>Laporan Pembelian</Text>
            </View>

            {loading && !refreshing ? (
                <View style={tw`flex-1 items-center justify-center`}>
                    <ActivityIndicator size="large" color="#ea580c" />
                </View>
            ) : (
                <FlatList
                    data={purchases}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={tw`p-4`}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                            colors={['#ea580c']}
                            tintColor="#ea580c"
                        />
                    }
                    ListEmptyComponent={
                        <View style={tw`items-center justify-center py-20`}>
                            <ShoppingCart size={48} color="#9ca3af" />
                            <Text style={tw`text-gray-500 mt-4`}>Belum ada data pembelian</Text>
                        </View>
                    }
                    renderItem={({ item }) => (
                        <View style={tw`bg-white rounded-xl mb-3 border border-gray-200 shadow-sm overflow-hidden`}>
                            <View style={tw`p-4`}>
                                <View style={tw`flex-row justify-between items-start mb-2`}>
                                    <View style={tw`flex-1`}>
                                        <Text style={tw`font-bold text-gray-900 text-base`}>
                                            {item.supplier_name || 'Supplier Umum'}
                                        </Text>
                                        <Text style={tw`text-xs text-gray-500 mt-1`}>
                                            {formatDate(item.created_at)}
                                        </Text>
                                    </View>
                                    <Text style={tw`font-bold text-orange-600 text-base`}>
                                        Rp {item.total_amount?.toLocaleString('id-ID')}
                                    </Text>
                                </View>
                                <Text style={tw`text-gray-500 text-xs mb-3`}>
                                    #{item.invoice_number || item.id.substring(0, 8)}
                                </Text>
                                {item.description && (
                                    <Text style={tw`text-gray-600 text-sm mb-3`} numberOfLines={2}>
                                        {item.description}
                                    </Text>
                                )}
                            </View>

                            {/* Action Buttons */}
                            <View style={tw`flex-row border-t border-gray-200`}>
                                <TouchableOpacity
                                    onPress={() => handleEdit(item.id)}
                                    style={tw`flex-1 flex-row items-center justify-center py-3 border-r border-gray-200`}
                                >
                                    <Edit2 size={18} color="#3b82f6" />
                                    <Text style={tw`text-blue-600 font-semibold ml-2`}>Edit</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    onPress={() => handleDeletePress(item.id)}
                                    style={tw`flex-1 flex-row items-center justify-center py-3`}
                                >
                                    <Trash2 size={18} color="#ef4444" />
                                    <Text style={tw`text-red-600 font-semibold ml-2`}>Hapus</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}
                />
            )}
            {/* Delete Confirmation Modal */}
            <ConfirmationModal
                visible={showDeleteModal}
                title="Hapus Pembelian"
                message="Apakah Anda yakin ingin menghapus data pembelian ini? Tindakan ini tidak dapat dibatalkan."
                type="danger"
                confirmText="Hapus"
                cancelText="Batal"
                onConfirm={handleDeleteConfirm}
                onCancel={() => {
                    setShowDeleteModal(false);
                    setDeleteTargetId(null);
                }}
            />

            {/* Status Modal */}
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
