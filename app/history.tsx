import { useState, useCallback, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, Alert, Modal, ScrollView } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Transaction } from '../types';
import { FileText, Trash2, ArrowLeft, Filter, X, Calendar, User as UserIcon, Printer, RefreshCw } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import tw from 'twrnc';
import { usePrinter } from '../context/PrinterContext';
import { generateReceiptText } from '../utils/receiptGenerator';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { useOffline } from '../context/OfflineContext';

export default function HistoryScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { printReceipt } = usePrinter();
    const { role } = useAuth();
    const { queue, syncNow, isSyncing } = useOffline(); // Get offline queue and sync tools
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);

    // Filter State
    const [showFilters, setShowFilters] = useState(false);
    const [users, setUsers] = useState<{ id: string, full_name: string }[]>([]);
    const [selectedUser, setSelectedUser] = useState<string | null>(null);
    const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month'>('all');

    // Store Settings for Receipt
    const [storeSettings, setStoreSettings] = useState({
        storeName: 'Nama Toko',
        storeAddress: 'Alamat Toko',
        storePhone: '',
    });

    useEffect(() => {
        loadSettings();
    }, []);

    useFocusEffect(
        useCallback(() => {
            fetchTransactions();
            fetchUsers();
            return () => { };
        }, [dateFilter, selectedUser])
    );

    const loadSettings = async () => {
        try {
            const saved = await AsyncStorage.getItem('store_settings');
            if (saved) {
                const parsed = JSON.parse(saved);
                setStoreSettings(prev => ({
                    ...prev,
                    storeName: parsed.storeName || prev.storeName,
                    storeAddress: parsed.storeAddress || prev.storeAddress,
                    storePhone: parsed.storePhone || prev.storePhone,
                }));
            }
        } catch (e) {
            console.error(e);
        }
    };

    // Compute Offline Transactions
    const offlineTransactions = queue
        .filter(q => q.type === 'INSERT_TRANSACTION')
        .map(q => ({
            ...q.payload.transaction,
            id: `OFFLINE-${q.id}`,
            items: q.payload.items,
            status: 'offline_pending',
            created_at: new Date(q.timestamp).toISOString(),
            customer: q.payload.transaction.customer_id ? { name: 'Customer (Offline)' } : null
        }));

    // Merge for Display
    const displayedTransactions = [...offlineTransactions, ...transactions];

    const fetchUsers = async () => {
        try {
            const { data } = await supabase.from('profiles').select('id, full_name');
            setUsers(data || []);
        } catch (error) {
            console.log('Error fetching users for filter', error);
        }
    };

    const fetchTransactions = async () => {
        let timeoutId: any;
        try {
            setLoading(true);

            // Add 10-second timeout to the fetch
            const controller = new AbortController();
            timeoutId = setTimeout(() => controller.abort(), 10000);

            const branchId = await AsyncStorage.getItem('selected_branch_id');

            let query = supabase
                .from('transactions')
                .select(`
                    *,
                    customer:customers(id, name),
                    transaction_items(
                        id,
                        quantity,
                        price,
                        product_name,
                        product:products(id, name, image_url)
                    )
                `)
                .order('created_at', { ascending: false })
                .abortSignal(controller.signal);

            // Apply Branch Filter
            if (branchId) {
                query = query.eq('branch_id', branchId);
            }

            // Apply User Filter
            if (selectedUser) {
                query = query.eq('user_id', selectedUser);
            }

            // Apply Date Filter
            const now = new Date();
            if (dateFilter === 'today') {
                const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
                query = query.gte('created_at', today);
            } else if (dateFilter === 'week') {
                const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
                query = query.gte('created_at', weekAgo);
            } else if (dateFilter === 'month') {
                const monthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate()).toISOString();
                query = query.gte('created_at', monthAgo);
            }

            const { data, error } = await query;
            clearTimeout(timeoutId);

            if (error) throw error;

            // Map data to handle renamed fields if necessary
            const mappedData = (data || []).map((t: any) => ({
                ...t,
                items: t.transaction_items || []
            }));

            setTransactions(mappedData);
        } catch (error: any) {
            if (timeoutId) clearTimeout(timeoutId);
            console.error('Error fetching transactions:', error);
            // If it's an abort error, it means timeout or manual cancel
            if (error.name === 'AbortError') {
                console.log('Transaction fetch timed out/aborted.');
            } else {
                Alert.alert('Error', 'Gagal memuat data transaksi');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteTransaction = (id: string) => {
        Alert.alert(
            'Hapus Transaksi',
            'Apakah Anda yakin ingin menghapus transaksi ini? Data tidak dapat dikembalikan.',
            [
                { text: 'Batal', style: 'cancel' },
                {
                    text: 'Hapus',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            const { error } = await supabase
                                .from('transactions')
                                .delete()
                                .eq('id', id);

                            if (error) throw error;

                            setTransactions(prev => prev.filter(t => t.id !== id));
                            setSelectedTransaction(null);
                            Alert.alert('Sukses', 'Transaksi berhasil dihapus.');
                        } catch (error: any) {
                            Alert.alert('Gagal', `Gagal menghapus: ${error.message}. Cek izin database.`);
                        }
                    }
                }
            ]
        );
    };

    const handleUpdateStatus = (id: string, newStatus: string, label: string) => {
        Alert.alert(
            `Konfirmasi ${label}`,
            `Ubah status transaksi terpilih menjadi "${newStatus}"?`,
            [
                { text: 'Batal', style: 'cancel' },
                {
                    text: 'Ya, Lanjutkan',
                    onPress: async () => {
                        try {
                            const { error } = await supabase
                                .from('transactions')
                                .update({ status: newStatus })
                                .eq('id', id);

                            if (error) throw error;

                            setTransactions(prev => prev.map(t =>
                                t.id === id ? { ...t, status: newStatus } as any : t
                            ));

                            if (selectedTransaction) {
                                setSelectedTransaction(prev => prev ? { ...prev, status: newStatus } as any : null);
                            }

                            Alert.alert('Sukses', `Status berhasil diubah menjadi ${newStatus}.`);
                        } catch (error: any) {
                            Alert.alert('Gagal', `Gagal mengubah status: ${error.message}.`);
                        }
                    }
                }
            ]
        );
    };

    const handlePrint = async () => {
        if (!selectedTransaction) return;
        try {
            const text = generateReceiptText(
                {
                    id: selectedTransaction.id,
                    date: new Date(selectedTransaction.created_at),
                    items: selectedTransaction.items || [],
                    total: selectedTransaction.total_amount,
                    received: (selectedTransaction as any).received_amount || selectedTransaction.total_amount,
                    change: (selectedTransaction as any).change || 0,
                    customerName: selectedTransaction.customer?.name,
                    tableNumber: selectedTransaction.table_number,
                },
                {
                    storeName: storeSettings.storeName,
                    storeAddress: storeSettings.storeAddress,
                    storePhone: storeSettings.storePhone,
                    footerMessage: (storeSettings as any).footerMessage,
                }
            );
            await printReceipt(text);
        } catch (error) {
            console.error(error);
            Alert.alert('Gagal Print', 'Terjadi kesalahan saat mencetak.');
        }
    };

    const formatDate = (dateString: string) => {
        if (!dateString) return '-';
        const date = new Date(dateString);
        return new Intl.DateTimeFormat('id-ID', {
            day: 'numeric', month: 'long', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
        }).format(date);
    };

    const getStatusColor = (status: string) => {
        const s = status || 'completed';
        switch (s) {
            case 'completed': return 'bg-green-100 text-green-700';
            case 'pending': return 'bg-yellow-100 text-yellow-700';
            case 'cancelled': return 'bg-red-100 text-red-700';
            case 'returned': return 'bg-orange-100 text-orange-700';
            case 'offline_pending': return 'bg-gray-200 text-gray-600';
            default: return 'bg-gray-100 text-gray-700';
        }
    };

    const getStatusLabel = (status: string) => {
        const s = status || 'completed';
        switch (s) {
            case 'completed': return 'Berhasil';
            case 'pending': return 'Menunggu';
            case 'cancelled': return 'Dibatalkan';
            case 'returned': return 'Diretur';
            case 'offline_pending': return 'Menunggu Upload';
            default: return s;
        }
    };

    return (
        <View style={[tw`flex-1 bg-gray-50`, { paddingTop: insets.top }]}>
            {/* Header */}
            <View style={tw`bg-white px-4 py-3 flex-row items-center justify-between border-b border-gray-200 shadow-sm`}>
                <View style={tw`flex-row items-center`}>
                    <TouchableOpacity onPress={() => router.back()} style={tw`p-2 -ml-2 rounded-full active:bg-gray-100`}>
                        <ArrowLeft size={24} color="#1f2937" />
                    </TouchableOpacity>
                    <Text style={tw`text-lg font-bold text-gray-900 ml-2`}>Riwayat Transaksi</Text>
                </View>
                <TouchableOpacity
                    onPress={() => setShowFilters(true)}
                    style={[tw`p-2 rounded-full`, (dateFilter !== 'all' || selectedUser) ? tw`bg-blue-100` : tw`bg-gray-100`]}
                >
                    <Filter size={20} color={(dateFilter !== 'all' || selectedUser) ? "#2563eb" : "#4b5563"} />
                </TouchableOpacity>
            </View>

            {/* Active Filters Indicator */}
            {(dateFilter !== 'all' || selectedUser) && (
                <View style={tw`px-4 py-2 bg-blue-50 flex-row gap-2 flex-wrap`}>
                    {dateFilter !== 'all' && (
                        <View style={tw`bg-white border border-blue-200 px-2 py-1 rounded-md flex-row items-center gap-1`}>
                            <Calendar size={12} color="#2563eb" />
                            <Text style={tw`text-xs text-blue-700 capitalize`}>{dateFilter === 'today' ? 'Hari Ini' : dateFilter === 'week' ? 'Minggu Ini' : 'Bulan Ini'}</Text>
                        </View>
                    )}
                    {selectedUser && (
                        <View style={tw`bg-white border border-blue-200 px-2 py-1 rounded-md flex-row items-center gap-1`}>
                            <UserIcon size={12} color="#2563eb" />
                            <Text style={tw`text-xs text-blue-700`}>{users.find(u => u.id === selectedUser)?.full_name || 'User'}</Text>
                        </View>
                    )}
                    <TouchableOpacity onPress={() => { setDateFilter('all'); setSelectedUser(null); }}>
                        <Text style={tw`text-xs text-red-500 underline ml-1`}>Reset</Text>
                    </TouchableOpacity>
                </View>
            )}

            {/* Offline Queue Sync Indicator */}
            {queue.length > 0 && (
                <View style={tw`mx-4 mt-3 bg-orange-50 border border-orange-100 rounded-xl p-3 flex-row items-center justify-between`}>
                    <View style={tw`flex-row items-center gap-2`}>
                        <RefreshCw size={18} color="#c2410c" style={isSyncing ? tw`opacity-50` : {}} />
                        <View>
                            <Text style={tw`text-orange-900 font-bold text-sm`}>{queue.length} Transaksi Belum Terkirim</Text>
                            <Text style={tw`text-orange-700 text-xs`}>Data tersimpan di HP ini</Text>
                        </View>
                    </View>
                    <TouchableOpacity
                        onPress={() => syncNow()}
                        disabled={isSyncing}
                        style={tw`bg-orange-600 px-3 py-1.5 rounded-lg`}
                    >
                        {isSyncing ? (
                            <ActivityIndicator size="small" color="white" />
                        ) : (
                            <Text style={tw`text-white font-bold text-xs`}>Sync Sekarang</Text>
                        )}
                    </TouchableOpacity>
                </View>
            )}

            <FlatList
                data={displayedTransactions}
                keyExtractor={(item) => item.id}
                contentContainerStyle={tw`p-4 pb-20`}
                ListEmptyComponent={
                    loading ? (
                        <View style={tw`items-center justify-center py-20`}>
                            <ActivityIndicator size="large" color="#2563eb" />
                            <Text style={tw`text-gray-500 mt-4`}>Memuat data...</Text>
                        </View>
                    ) : (
                        <View style={tw`items-center justify-center py-20`}>
                            <FileText size={48} color="#9ca3af" />
                            <Text style={tw`text-gray-500 mt-4`}>Belum ada transaksi</Text>
                        </View>
                    )
                }
                renderItem={({ item }) => (
                    <TouchableOpacity
                        onPress={() => setSelectedTransaction(item)}
                        style={tw`bg-white p-4 rounded-xl mb-3 border border-gray-200 shadow-sm active:bg-gray-50`}
                    >
                        <View style={tw`flex-row justify-between items-start mb-2`}>
                            <View style={tw`flex-row items-center gap-2`}>
                                <View style={tw`bg-blue-50 p-2 rounded-lg`}>
                                    <FileText size={16} color="#2563eb" />
                                </View>
                                <View>
                                    <View style={tw`flex-row items-center gap-2`}>
                                        <Text style={tw`font-bold text-gray-900 text-base`}>
                                            #{item.id?.substring(0, 8) || 'ID'}
                                        </Text>
                                        {item.items?.some((i: any) => !i.product_id) && (
                                            <View style={tw`bg-purple-100 px-2 py-0.5 rounded-md`}>
                                                <Text style={tw`text-purple-700 text-[10px] font-bold`}>MANUAL</Text>
                                            </View>
                                        )}
                                    </View>
                                    {item.customer ? (
                                        <Text style={tw`text-xs font-bold text-purple-600 mb-0.5`}>
                                            {item.customer.name}
                                        </Text>
                                    ) : (
                                        <Text style={tw`text-xs font-bold text-gray-400 mb-0.5`}>
                                            Guest
                                        </Text>
                                    )}
                                    <Text style={tw`text-xs text-gray-500`}>
                                        {formatDate(item.created_at)}
                                    </Text>
                                    {item.table_number && (
                                        <View style={tw`bg-orange-100 self-start px-2 py-0.5 rounded-md mt-1`}>
                                            <Text style={tw`text-orange-700 text-xs font-bold`}>Meja {item.table_number}</Text>
                                        </View>
                                    )}
                                </View>
                            </View>
                            <View style={tw`px-2 py-1 rounded-full ${getStatusColor(item.status).split(' ')[0]}`}>
                                <Text style={tw`text-xs font-bold ${getStatusColor(item.status).split(' ')[1]}`}>
                                    {getStatusLabel(item.status)}
                                </Text>
                            </View>
                        </View>
                        <View style={tw`flex-row justify-between items-center mt-2 border-t border-gray-50 pt-3`}>
                            <Text style={tw`text-gray-500`}>Total Pembayaran</Text>
                            <Text style={tw`text-lg font-bold text-blue-600`}>
                                Rp {(item.total_amount || 0).toLocaleString('id-ID')}
                            </Text>
                        </View>
                    </TouchableOpacity>
                )}
            />

            {/* Filter Modal */}
            <Modal visible={showFilters} transparent animationType="slide" onRequestClose={() => setShowFilters(false)}>
                <View style={tw`flex-1 bg-black/50 justify-end`}>
                    <View style={tw`bg-white rounded-t-2xl p-4`}>
                        <View style={tw`flex-row justify-between items-center mb-4`}>
                            <Text style={tw`text-lg font-bold`}>Filter Laporan</Text>
                            <TouchableOpacity onPress={() => setShowFilters(false)}>
                                <X size={24} color="gray" />
                            </TouchableOpacity>
                        </View>

                        <Text style={tw`font-bold text-gray-700 mb-2`}>Waktu Transaksi</Text>
                        <View style={tw`flex-row gap-2 mb-4`}>
                            {['all', 'today', 'week', 'month'].map((period) => (
                                <TouchableOpacity
                                    key={period}
                                    onPress={() => setDateFilter(period as any)}
                                    style={[
                                        tw`px-3 py-2 rounded-lg border`,
                                        dateFilter === period ? tw`bg-blue-600 border-blue-600` : tw`bg-white border-gray-300`
                                    ]}
                                >
                                    <Text style={[tw`text-xs font-bold`, dateFilter === period ? tw`text-white` : tw`text-gray-700`]}>
                                        {period === 'all' ? 'Semua' : period === 'today' ? 'Hari Ini' : period === 'week' ? 'Minggu Ini' : 'Bulan Ini'}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <Text style={tw`font-bold text-gray-700 mb-2`}>Petugas Kasir</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={tw`mb-6`}>
                            <TouchableOpacity
                                onPress={() => setSelectedUser(null)}
                                style={[
                                    tw`px-3 py-2 rounded-lg border mr-2`,
                                    selectedUser === null ? tw`bg-blue-600 border-blue-600` : tw`bg-white border-gray-300`
                                ]}
                            >
                                <Text style={[tw`text-xs font-bold`, selectedUser === null ? tw`text-white` : tw`text-gray-700`]}>Semua</Text>
                            </TouchableOpacity>
                            {users.map(u => (
                                <TouchableOpacity
                                    key={u.id}
                                    onPress={() => setSelectedUser(u.id)}
                                    style={[
                                        tw`px-3 py-2 rounded-lg border mr-2`,
                                        selectedUser === u.id ? tw`bg-blue-600 border-blue-600` : tw`bg-white border-gray-300`
                                    ]}
                                >
                                    <Text style={[tw`text-xs font-bold`, selectedUser === u.id ? tw`text-white` : tw`text-gray-700`]}>{u.full_name}</Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>

                        <TouchableOpacity
                            onPress={() => setShowFilters(false)}
                            style={tw`bg-blue-600 p-3 rounded-xl items-center`}
                        >
                            <Text style={tw`text-white font-bold`}>Terapkan Filter</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* Detail Modal */}
            <Modal
                visible={!!selectedTransaction}
                animationType="slide"
                presentationStyle="pageSheet"
                onRequestClose={() => setSelectedTransaction(null)}
            >
                {selectedTransaction && (
                    <View style={tw`flex-1 bg-white`}>
                        <View style={tw`px-4 py-4 border-b border-gray-200 flex-row items-center justify-between bg-gray-50`}>
                            <View>
                                <Text style={tw`text-lg font-bold text-gray-900`}>Detail Transaksi</Text>
                                <Text style={tw`text-gray-500 text-sm`}>#{selectedTransaction.id?.substring(0, 12)}...</Text>
                            </View>
                            <TouchableOpacity
                                onPress={() => setSelectedTransaction(null)}
                                style={tw`bg-gray-200 p-2 rounded-full`}
                            >
                                <X size={20} color="#374151" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView contentContainerStyle={tw`p-4`}>
                            {/* Status Card */}
                            <View style={tw`bg-white border border-gray-200 rounded-xl p-4 mb-4 shadow-sm`}>
                                <View style={tw`flex-row justify-between items-center mb-4`}>
                                    <Text style={tw`text-gray-500`}>Status</Text>
                                    <View style={tw`px-3 py-1 rounded-full ${getStatusColor(selectedTransaction.status).split(' ')[0]}`}>
                                        <Text style={tw`font-bold ${getStatusColor(selectedTransaction.status).split(' ')[1]}`}>
                                            {getStatusLabel(selectedTransaction.status)}
                                        </Text>
                                    </View>
                                </View>
                                <View style={tw`flex-row justify-between items-center mb-4`}>
                                    <Text style={tw`text-gray-500`}>Waktu</Text>
                                    <Text style={tw`font-medium text-gray-900`}>{formatDate(selectedTransaction.created_at)}</Text>
                                </View>
                                <View style={tw`flex-row justify-between items-center`}>
                                    <Text style={tw`text-gray-500`}>Metode Pembayaran</Text>
                                    <Text style={tw`font-medium text-gray-900 uppercase`}>{selectedTransaction.payment_method || '-'}</Text>
                                </View>
                            </View>

                            {/* Items */}
                            <Text style={tw`font-bold text-gray-900 mb-3 text-lg`}>Produk Dibeli</Text>
                            <View style={tw`bg-white border border-gray-200 rounded-xl overflow-hidden mb-6`}>
                                {selectedTransaction.items?.map((item, index) => (
                                    <View key={item.id || index} style={tw`p-4 flex-row justify-between border-b border-gray-100 last:border-0`}>
                                        <View style={tw`flex-1 mr-4`}>
                                            <Text style={tw`font-medium text-gray-900`}>
                                                {item.product?.name || item.product_name || 'Produk dihapus'}
                                            </Text>
                                            <Text style={tw`text-gray-500 text-xs`}>
                                                {item.quantity} x Rp {(item.price || 0).toLocaleString('id-ID')}
                                            </Text>
                                        </View>
                                        <Text style={tw`font-bold text-gray-900`}>
                                            Rp {(item.quantity * item.price).toLocaleString('id-ID')}
                                        </Text>
                                    </View>
                                ))}

                                <View style={tw`bg-gray-50 p-4 flex-row justify-between items-center`}>
                                    <Text style={tw`font-bold text-gray-900`}>Total</Text>
                                    <Text style={tw`font-bold text-blue-600 text-xl`}>
                                        Rp {(selectedTransaction.total_amount || 0).toLocaleString('id-ID')}
                                    </Text>
                                </View>
                            </View>

                            {/* ACTION BUTTONS (CRUD) */}
                            <Text style={tw`font-bold text-gray-900 mb-3 text-lg`}>Tindakan</Text>
                            <View style={tw`gap-3 pb-8`}>
                                {/* Print */}
                                <TouchableOpacity
                                    onPress={handlePrint}
                                    style={tw`flex-row items-center justify-center gap-2 bg-blue-600 py-3 rounded-xl`}
                                >
                                    <Printer size={20} color="white" />
                                    <Text style={tw`text-white font-bold`}>Cetak Struk</Text>
                                </TouchableOpacity>

                                {/* Only Admin can Return or Delete */}
                                {role === 'admin' && (
                                    <>
                                        {/* Return */}
                                        {(selectedTransaction.status as string) !== 'returned' && (selectedTransaction.status as string) !== 'cancelled' && (
                                            <TouchableOpacity
                                                onPress={() => handleUpdateStatus(selectedTransaction.id, 'returned', 'Retur Barang')}
                                                style={tw`flex-row items-center justify-center gap-2 bg-orange-100 py-3 rounded-xl border border-orange-200`}
                                            >
                                                <RefreshCw size={20} color="#c2410c" />
                                                <Text style={tw`text-orange-700 font-bold`}>Retur / Batalkan</Text>
                                            </TouchableOpacity>
                                        )}

                                        {/* Delete */}
                                        <TouchableOpacity
                                            onPress={() => handleDeleteTransaction(selectedTransaction.id)}
                                            style={tw`flex-row items-center justify-center gap-2 bg-red-100 py-3 rounded-xl border border-red-200`}
                                        >
                                            <Trash2 size={20} color="#dc2626" />
                                            <Text style={tw`text-red-700 font-bold`}>Hapus Transaksi</Text>
                                        </TouchableOpacity>
                                    </>
                                )}
                            </View>

                        </ScrollView>
                    </View>
                )}
            </Modal>
        </View>
    );
}
