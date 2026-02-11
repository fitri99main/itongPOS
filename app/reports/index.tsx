import { useState, useCallback } from 'react';
import { View, Text, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { ArrowLeft, TrendingUp, TrendingDown, DollarSign, Calendar, RefreshCw } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import tw from 'twrnc';
import { ConfirmationModal } from '../../components/ConfirmationModal';

type FilterPeriod = 'today' | 'week' | 'month' | 'all';

export default function ReportsScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const [loading, setLoading] = useState(true);
    const [filterPeriod, setFilterPeriod] = useState<FilterPeriod>('month');
    const [summary, setSummary] = useState({
        sales: 0,
        purchases: 0,
        returns: 0,
        profit: 0,
        transactionCount: 0
    });

    // Notification/Action Modal State
    const [showStatusModal, setShowStatusModal] = useState(false);
    const [statusModalConfig, setStatusModalConfig] = useState({
        title: '',
        message: '',
        type: 'info' as 'info' | 'success' | 'danger' | 'warning',
        onConfirm: () => { },
        children: null as React.ReactNode
    });

    useFocusEffect(
        useCallback(() => {
            fetchSummary();
        }, [filterPeriod])
    );

    const getFilterLabel = () => {
        switch (filterPeriod) {
            case 'today': return 'Hari Ini';
            case 'week': return 'Minggu Ini';
            case 'month': return 'Bulan Ini';
            case 'all': return 'Semua Waktu';
            default: return 'Bulan Ini';
        }
    };

    const handleFilterPress = () => {
        const periods: FilterPeriod[] = ['today', 'week', 'month', 'all'];
        const labels = ['Hari Ini', 'Minggu Ini (7 Hari)', 'Bulan Ini', 'Semua Waktu'];

        setStatusModalConfig({
            title: 'Pilih Periode',
            message: 'Tampilkan data untuk rentang waktu:',
            type: 'info',
            onConfirm: () => setShowStatusModal(false),
            children: (
                <View style={tw`gap-2 mt-4`}>
                    {periods.map((p, i) => (
                        <TouchableOpacity
                            key={p}
                            onPress={() => {
                                setFilterPeriod(p);
                                setShowStatusModal(false);
                            }}
                            style={tw`bg-gray-50 p-4 rounded-xl border border-gray-100 items-center ${filterPeriod === p ? 'bg-blue-50 border-blue-200' : ''}`}
                        >
                            <Text style={tw`font-bold ${filterPeriod === p ? 'text-blue-700' : 'text-gray-700'}`}>{labels[i]}</Text>
                        </TouchableOpacity>
                    ))}
                </View>
            )
        });
        setShowStatusModal(true);
    };

    const fetchSummary = async () => {
        setLoading(true);
        try {
            // Determine Date Range
            let startDate = new Date();
            const now = new Date();

            if (filterPeriod === 'today') {
                startDate.setHours(0, 0, 0, 0);
            } else if (filterPeriod === 'week') {
                startDate.setDate(now.getDate() - 7);
            } else if (filterPeriod === 'month') {
                startDate.setDate(1); // First day of current month
                startDate.setHours(0, 0, 0, 0);
            } else {
                startDate = new Date(0); // 1970 (All time)
            }

            const isoDate = startDate.toISOString();

            // Fetch Sales (Completed) and Returns
            let query = supabase
                .from('transactions')
                .select('total_amount, status, created_at')
                .in('status', ['completed', 'returned']); // Fetch both

            if (filterPeriod !== 'all') {
                query = query.gte('created_at', isoDate);
            }

            const { data: transactionsData, error: transError } = await query;

            if (transError) {
                console.error('Transactions fetch error:', transError);
                throw transError;
            }

            // Calculate Sales and Returns
            const totalSales = transactionsData
                ?.filter(t => t.status === 'completed')
                .reduce((sum, item) => sum + item.total_amount, 0) || 0;

            const totalReturns = transactionsData
                ?.filter(t => t.status === 'returned')
                .reduce((sum, item) => sum + item.total_amount, 0) || 0;

            // Fetch COGS (Cost of Goods Sold) from transaction_items
            // Join with transactions to filter by date and status
            let cogsQuery = supabase
                .from('transaction_items')
                .select('cost_price, quantity, transactions!inner(created_at, status)')
                .eq('transactions.status', 'completed');

            if (filterPeriod !== 'all') {
                cogsQuery = cogsQuery.gte('transactions.created_at', isoDate);
            }

            const { data: itemsData, error: itemsError } = await cogsQuery;

            let totalCOGS = 0;
            if (!itemsError && itemsData) {
                totalCOGS = itemsData.reduce((sum, item) => {
                    const costPrice = item.cost_price || 0;
                    return sum + (costPrice * item.quantity);
                }, 0);
            } else if (itemsError) {
                console.error('COGS fetch error:', itemsError);
                // Continue with COGS = 0 if query fails (e.g., column doesn't exist yet)
            }

            // Fetch Purchases (for reference, not used in profit calculation anymore)
            let purchasesQuery = supabase
                .from('purchases')
                .select('total_amount, created_at');

            if (filterPeriod !== 'all') {
                purchasesQuery = purchasesQuery.gte('created_at', isoDate);
            }

            let totalPurchases = 0;
            try {
                const { data: purchasesData, error: purchasesError } = await purchasesQuery;

                if (!purchasesError && purchasesData) {
                    totalPurchases = purchasesData.reduce((sum, item) => sum + item.total_amount, 0);
                }
            } catch (err) {
                console.log('Purchase fetch exception', err);
            }

            setSummary({
                sales: totalSales,
                purchases: totalPurchases, // Keep for reference
                returns: totalReturns,
                profit: totalSales - totalCOGS, // Gross Profit = Sales - COGS
                transactionCount: transactionsData?.length || 0
            });

        } catch (error: any) {
            console.error('Error fetching reports:', error);
            setStatusModalConfig({
                title: 'Gagal Memuat Laporan',
                message: error.message,
                type: 'danger',
                onConfirm: () => setShowStatusModal(false),
                children: null
            });
            setShowStatusModal(true);
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
                <Text style={tw`text-lg font-bold text-gray-900 ml-2`}>Laporan Laba Rugi</Text>
            </View>

            {loading ? (
                <View style={tw`flex-1 items-center justify-center`}>
                    <ActivityIndicator size="large" color="#2563eb" />
                </View>
            ) : (
                <ScrollView contentContainerStyle={tw`p-4`}>
                    <View style={tw`flex-row items-center justify-between mb-6`}>
                        <Text style={tw`text-gray-500`}>Periode: <Text style={tw`font-bold text-gray-800`}>{getFilterLabel()}</Text></Text>
                        <TouchableOpacity
                            onPress={handleFilterPress}
                            style={tw`flex-row items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-gray-200 active:bg-gray-50`}
                        >
                            <Calendar size={16} color="#374151" />
                            <Text style={tw`text-gray-700 text-sm font-medium`}>Filter Tanggal</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Net Profit Card */}
                    <View style={tw`bg-blue-600 rounded-2xl p-6 shadow-lg mb-6`}>
                        <Text style={tw`text-blue-100 font-medium mb-1`}>Keuntungan Bersih (Gross Profit)</Text>
                        <Text style={tw`text-4xl font-bold text-white`}>
                            Rp {summary.profit.toLocaleString('id-ID')}
                        </Text>
                        <View style={tw`mt-4 flex-row items-center gap-2 bg-blue-700/40 self-start px-3 py-1 rounded-lg`}>
                            <TrendingUp size={16} color="#4ade80" />
                            <Text style={tw`text-green-300 font-medium`}>Total Penjualan - HPP</Text>
                        </View>
                    </View>

                    {/* Breakdown Cards */}
                    <View style={tw`flex-row gap-3 mb-6`}>
                        <View style={tw`flex-1 bg-white p-4 rounded-xl border border-gray-100 shadow-sm`}>
                            <View style={tw`bg-green-50 w-10 h-10 items-center justify-center rounded-lg mb-3`}>
                                <TrendingUp size={20} color="#16a34a" />
                            </View>
                            <Text style={tw`text-gray-500 text-xs mb-1`}>Total Pendapatan</Text>
                            <Text style={tw`text-lg font-bold text-gray-900`}>
                                Rp {summary.sales.toLocaleString('id-ID')}
                            </Text>
                        </View>

                        <View style={tw`flex-1 bg-white p-4 rounded-xl border border-gray-100 shadow-sm`}>
                            <View style={tw`bg-red-50 w-10 h-10 items-center justify-center rounded-lg mb-3`}>
                                <TrendingDown size={20} color="#dc2626" />
                            </View>
                            <Text style={tw`text-gray-500 text-xs mb-1`}>Total Pembelian</Text>
                            <Text style={tw`text-lg font-bold text-gray-900`}>
                                Rp {summary.purchases.toLocaleString('id-ID')}
                            </Text>
                        </View>

                        <View style={tw`flex-1 bg-white p-4 rounded-xl border border-gray-100 shadow-sm`}>
                            <View style={tw`bg-orange-50 w-10 h-10 items-center justify-center rounded-lg mb-3`}>
                                <RefreshCw size={20} color="#ea580c" />
                            </View>
                            <Text style={tw`text-gray-500 text-xs mb-1`}>Total Retur</Text>
                            <Text style={tw`text-lg font-bold text-gray-900`}>
                                Rp {summary.returns.toLocaleString('id-ID')}
                            </Text>
                        </View>
                    </View>

                    {/* Detailed List Link (Placeholder for now, or link to history) */}
                    <TouchableOpacity
                        onPress={() => router.push('/history')}
                        style={tw`bg-white p-4 rounded-xl border border-gray-200 flex-row items-center justify-between active:bg-gray-50`}
                    >
                        <View style={tw`flex-row items-center gap-3`}>
                            <View style={tw`bg-gray-100 min-w-[32px] h-8 items-center justify-center rounded-lg`}>
                                <Text style={tw`text-gray-600 font-bold text-xs`}>Rp</Text>
                            </View>
                            <View>
                                <Text style={tw`font-bold text-gray-900`}>Lihat Detail Transaksi</Text>
                                <Text style={tw`text-xs text-gray-500`}>{summary.transactionCount} Transaksi tercatat</Text>
                            </View>
                        </View>
                        <ArrowLeft size={16} color="#9ca3af" style={{ transform: [{ rotate: '180deg' }] }} />
                    </TouchableOpacity>

                </ScrollView>
            )}

            <ConfirmationModal
                visible={showStatusModal}
                title={statusModalConfig.title}
                message={statusModalConfig.message}
                type={statusModalConfig.type}
                confirmText={statusModalConfig.title.includes('Pilih') ? null : 'OK'}
                cancelText={statusModalConfig.title.includes('Pilih') ? 'Batal' : null}
                onConfirm={statusModalConfig.onConfirm}
                onCancel={() => setShowStatusModal(false)}
            >
                {statusModalConfig.children}
            </ConfirmationModal>
        </View>
    );
}
