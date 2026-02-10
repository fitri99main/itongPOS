import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert, ActivityIndicator, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import {
    LayoutDashboard,
    History,
    Package,
    Users,
    Store,
    Settings,
    ChevronRight,
    TrendingUp,
    ShoppingCart,
    Award,
    Tag,
    LogOut
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ConfirmationModal } from '../components/ConfirmationModal';
import { useOffline } from '../context/OfflineContext';
import tw from 'twrnc';

interface BestSeller {
    id: string;
    name: string;
    totalSold: number;
    revenue: number;
    image_url: string | null;
}

export default function Profile() {
    const router = useRouter();
    const { signOut, user, role, permissions } = useAuth();
    const { isOnline } = useOffline();
    const insets = useSafeAreaInsets();
    const [loading, setLoading] = useState(true);
    const [todayStats, setTodayStats] = useState({ total: 0, count: 0 });
    const [bestSellers, setBestSellers] = useState<BestSeller[]>([]);
    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

    useEffect(() => {
        fetchDashboardData();

        // Realtime Subscription for Transactions
        const subscription = supabase
            .channel('public:transactions')
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'transactions' },
                (payload) => {
                    console.log('New transaction detected:', payload);
                    fetchDashboardData(); // Refresh dashboard stats
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(subscription);
        };
    }, []);

    const fetchDashboardData = async () => {
        try {
            const today = new Date().toISOString().split('T')[0];

            // 1. Fetch Today's Sales
            const { data: todayTrans, error: transError } = await supabase
                .from('transactions')
                .select('total_amount')
                .gte('created_at', `${today}T00:00:00`)
                .eq('status', 'completed');

            if (transError) {
                console.error('Error fetching today stats:', transError);
                // Don't throw, just continue with best sellers if possible
            }

            const total = todayTrans?.reduce((sum, t) => sum + t.total_amount, 0) || 0;
            const count = todayTrans?.length || 0;
            setTodayStats({ total, count });

            // 2. Fetch Recent Transactions to Calculate Best Sellers
            // Simplified query without aliases to avoid potential matching issues
            const { data: transactions, error: itemsError } = await supabase
                .from('transactions')
                .select(`
                    id,
                    transaction_items (
                        quantity,
                        price,
                        products (id, name, image_url)
                    )
                `)
                .eq('status', 'completed')
                .order('created_at', { ascending: false })
                .limit(50);

            if (itemsError) throw itemsError;

            // Aggregate Data
            const productStats: Record<string, BestSeller> = {};

            if (transactions) {
                transactions.forEach((t) => {
                    const items = t.transaction_items || [];
                    if (!Array.isArray(items)) return;

                    items.forEach((item: any) => {
                        // Handle potential array vs object for relation
                        // Supabase can return array of 1 or just object depending on query/schema
                        const productData = item.products;
                        const product = Array.isArray(productData) ? productData[0] : productData;

                        if (!product || !product.id) return;

                        const pid = product.id;

                        if (!productStats[pid]) {
                            productStats[pid] = {
                                id: pid,
                                name: product.name || 'Unknown Product',
                                image_url: product.image_url,
                                totalSold: 0,
                                revenue: 0
                            };
                        }

                        const qty = Number(item.quantity) || 0;
                        const price = Number(item.price) || 0;

                        productStats[pid].totalSold += qty;
                        productStats[pid].revenue += qty * price;
                    });
                });
            }

            const sorted = Object.values(productStats)
                .sort((a, b) => b.totalSold - a.totalSold)
                .slice(0, 5);

            setBestSellers(sorted);

        } catch (error: any) {
            console.error('Error loading dashboard:', error);
        } finally {
            setLoading(false);
        }
    };

    const menuItems = [
        {
            icon: <Store size={24} color="#2563eb" />,
            label: 'Shift Kasir (Buka/Tutup)',
            desc: 'Buka atau tutup sesi kasir harian',
            route: '/register'
        },
        {
            icon: <History size={24} color="#2563eb" />,
            label: 'Riwayat Transaksi',
            desc: 'Lihat semua transaksi penjualan',
            route: '/history'
        },
        {
            icon: <TrendingUp size={24} color="#16a34a" />,
            label: 'Laporan Laba Rugi',
            desc: 'Analisis keuntungan toko',
            route: '/reports'
        },
        {
            icon: <ShoppingCart size={24} color="#ea580c" />,
            label: 'Laporan Pembelian',
            desc: 'Rekap pembelian stok',
            route: '/reports/purchases'
        },
        {
            icon: <ShoppingCart size={24} color="#10b981" />,
            label: 'Input Pembelian',
            desc: 'Catat pengeluaran stok',
            route: '/purchases/add'
        },
        {
            icon: <Package size={24} color="#9333ea" />,
            label: 'Kelola Produk',
            desc: 'Tambah & edit produk',
            route: '/products'
        },
        {
            icon: <Tag size={24} color="#f59e0b" />,
            label: 'Kelola Kategori',
            desc: 'Tambah & edit kategori produk',
            route: '/categories'
        },
        {
            icon: <Users size={24} color="#db2777" />,
            label: 'Pelanggan',
            desc: 'Data pelanggan setia',
            route: '/customers'
        },
        {
            icon: <Store size={24} color="#0891b2" />,
            label: 'Kelola Toko',
            desc: 'Pengaturan toko & printer',
            route: '/store'
        },
        {
            icon: <Users size={24} color="#4338ca" />,
            label: 'Kelola Pengguna',
            desc: 'Tambah & atur akses kasir',
            route: '/users'
        }
    ];

    const handleSignOut = () => {
        setShowLogoutConfirm(true);
    };

    // Filter menu items based on role and permissions
    const filteredMenuItems = menuItems.filter(item => {
        if (role === 'admin') return true; // Admin sees all

        // Cashier granular permissions
        if (!permissions) {
            // Fallback to strict security if no permissions loaded
            const strictlyRestricted = ['/users', '/reports', '/store', '/products', '/categories'];
            return !strictlyRestricted.some(r => item.route.startsWith(r));
        }

        // Map routes to permission keys
        if (item.route === '/history') return permissions.history;
        if (item.route.startsWith('/reports')) return permissions.reports;
        if (item.route.startsWith('/products')) return permissions.products;
        if (item.route.startsWith('/categories')) return permissions.products;
        if (item.route.startsWith('/store')) return permissions.store;
        if (item.route.startsWith('/users')) return permissions.users;
        if (item.route.startsWith('/purchases')) return permissions.purchases;

        return true;
    });

    return (
        <View style={[tw`flex-1 bg-gray-50`, { paddingTop: insets.top }]}>
            {/* Header */}
            <View style={tw`bg-white px-4 py-4 border-b border-gray-200 flex-row items-center justify-between`}>
                <View>
                    <Text style={tw`text-2xl font-bold text-gray-900`}>Pengaturan</Text>
                    <View style={tw`flex-row items-center gap-2 mt-1`}>
                        <View style={[
                            tw`w-2.5 h-2.5 rounded-full`,
                            !isOnline ? tw`bg-red-500 shadow-sm shadow-red-200` :
                                role === 'admin' ? tw`bg-blue-500` :
                                    role === 'cashier' ? tw`bg-green-500` : tw`bg-gray-300`
                        ]} />
                        <Text style={[
                            tw`text-sm font-bold`,
                            !isOnline ? tw`text-red-600` : tw`text-gray-500`
                        ]}>
                            {!isOnline ? 'OFFLINE' : (role === 'admin' ? 'ADMINISTRATOR' : role === 'cashier' ? 'KASIR' : 'MEMUAT...')}
                        </Text>
                    </View>
                </View>
                <TouchableOpacity
                    onPress={() => router.back()}
                    style={tw`bg-gray-100 p-2 rounded-full`}
                >
                    <LayoutDashboard size={20} color="#4b5563" />
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={tw`p-4 pb-20`}>
                {/* Mini Dashboard Card */}
                {/* Only show dashboard summary to admin? Let's leave it for now but maybe hide sensitive revenue data later if requested. */}
                {role === 'admin' && (
                    <View style={tw`bg-blue-600 rounded-2xl p-6 mb-6 shadow-lg`}>
                        <Text style={tw`text-blue-100 font-medium mb-1`}>Penjualan Hari Ini</Text>
                        <Text style={tw`text-3xl font-bold text-white mb-4`}>
                            Rp {todayStats.total.toLocaleString('id-ID')}
                        </Text>

                        <View style={tw`flex-row bg-blue-700/50 rounded-xl p-3 justify-between items-center`}>
                            <View style={tw`flex-row items-center gap-2`}>
                                <ShoppingCart size={18} color="#93c5fd" />
                                <Text style={tw`text-blue-100`}>{todayStats.count} Transaksi</Text>
                            </View>
                            <View style={tw`flex-row items-center gap-1`}>
                                <TrendingUp size={16} color="#4ade80" />
                                <Text style={tw`text-green-300 font-bold`}>Live</Text>
                            </View>
                        </View>
                    </View>
                )}

                {/* Best Sellers Section - Hide for cashier if revenue is sensitive */}
                {role === 'admin' && (
                    <View style={tw`mb-6`}>
                        <View style={tw`flex-row items-center gap-2 mb-3`}>
                            <Award size={20} color="#eab308" />
                            <Text style={tw`text-lg font-bold text-gray-900`}>Produk Terlaris (Top 5)</Text>
                        </View>

                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={tw`pl-1`}>
                            {loading ? (
                                <View style={tw`w-full h-20 items-center justify-center flex-row gap-2`}>
                                    <ActivityIndicator color="#2563eb" />
                                    <Text style={tw`text-gray-400 text-xs`}>Menganalisis data...</Text>
                                </View>
                            ) : bestSellers.length === 0 ? (
                                <Text style={tw`text-gray-500 italic ml-2`}>Belum ada data penjualan yang cukup.</Text>
                            ) : (
                                bestSellers.map((item, index) => (
                                    <View key={item.id} style={tw`bg-white p-3 rounded-xl border border-gray-100 shadow-sm mr-3 w-36`}>
                                        <View style={tw`h-24 bg-gray-100 rounded-lg mb-2 overflow-hidden`}>
                                            {item.image_url ? (
                                                <Image source={{ uri: item.image_url }} style={tw`w-full h-full`} resizeMode="cover" />
                                            ) : (
                                                <View style={tw`w-full h-full items-center justify-center`}>
                                                    <Package size={24} color="#9ca3af" />
                                                </View>
                                            )}
                                            <View style={tw`absolute top-1 left-1 bg-yellow-400 px-2 py-0.5 rounded-full`}>
                                                <Text style={tw`text-[10px] font-bold text-yellow-900`}>#{index + 1}</Text>
                                            </View>
                                        </View>
                                        <Text style={tw`font-bold text-gray-900 text-sm`} numberOfLines={1}>{item.name}</Text>
                                        <Text style={tw`text-xs text-gray-500`}>{item.totalSold} terjual</Text>
                                        <Text style={tw`text-blue-600 font-bold text-xs mt-1`}>Rp {item.revenue.toLocaleString('id-ID')}</Text>
                                    </View>
                                ))
                            )}
                        </ScrollView>
                    </View>
                )}

                {/* Menu Grid */}
                <Text style={tw`text-lg font-bold text-gray-900 mb-3`}>Menu Utama</Text>
                <View style={tw`gap-3`}>
                    {filteredMenuItems.map((item, index) => (
                        <TouchableOpacity
                            key={index}
                            onPress={() => router.push(item.route as any)}
                            style={tw`bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex-row items-center gap-4 active:bg-gray-50`}
                        >
                            <View style={tw`bg-gray-50 p-3 rounded-lg`}>
                                {item.icon}
                            </View>
                            <View style={tw`flex-1`}>
                                <Text style={tw`font-bold text-gray-900 text-base`}>{item.label}</Text>
                                <Text style={tw`text-gray-500 text-xs`}>{item.desc}</Text>
                            </View>
                            <ChevronRight size={20} color="#d1d5db" />
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Account Section */}
                <Text style={tw`text-lg font-bold text-gray-900 mt-6 mb-3`}>Akun</Text>
                <TouchableOpacity
                    onPress={handleSignOut}
                    style={tw`bg-white p-4 rounded-xl shadow-sm border border-red-100 flex-row items-center gap-4`}
                >
                    <View style={tw`bg-red-50 p-3 rounded-lg`}>
                        <Settings size={24} color="#dc2626" />
                    </View>
                    <View style={tw`flex-1`}>
                        <Text style={tw`font-bold text-red-600 text-base`}>Keluar Aplikasi</Text>
                        <Text style={tw`text-red-400 text-xs`}>Logout dari sesi saat ini</Text>
                    </View>
                </TouchableOpacity>

                <Text style={tw`text-center text-gray-400 text-xs mt-8 pb-8`}>
                    KasirPOS by NandoDEV v0.0.3.-26
                </Text>
            </ScrollView>

            <ConfirmationModal
                visible={showLogoutConfirm}
                title="Keluar Aplikasi"
                message="Apakah Anda yakin ingin keluar dari sesi ini? Anda harus login ulang untuk masuk kembali."
                confirmText="Ya, Keluar"
                cancelText="Batal"
                type="danger"
                onCancel={() => setShowLogoutConfirm(false)}
                onConfirm={() => {
                    setShowLogoutConfirm(false);
                    signOut();
                }}
            />
        </View>
    );
}
