import { useState, useEffect, useCallback } from 'react';
import { View, Text, ActivityIndicator, FlatList, useWindowDimensions, TouchableOpacity, ScrollView, TextInput } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { supabase } from '../lib/supabase';
import { useOffline } from '../context/OfflineContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Product, Category } from '../types';
// import { Header } from '../components/Header';
// import { ProductCard } from '../components/ProductCard';
import { ProductCardModern as ProductCard } from '../components/ProductCardModern';
// import { CategoryFilter } from '../components/CategoryFilter';
import { CategoryFilterModern as CategoryFilter } from '../components/CategoryFilterModern';
// import { Header } from '../components/Header';
import { HeaderModern as Header } from '../components/HeaderModern';
import { TableSelector } from '../components/TableSelector';
import { CustomerSelector } from '../components/CustomerSelector';
import { ManualItemModal } from '../components/ManualItemModal';
import { CartFab } from '../components/CartFab';
import { CartPanel } from '../components/CartPanel';
import { RecallModal } from '../components/RecallModal';
import { ConfirmationModal } from '../components/ConfirmationModal';
import { ShoppingCart, Search, X, Archive } from 'lucide-react-native';
import { useCart } from '../context/CartContext';
import { useStore } from '../context/StoreContext';
import { useRegister } from '../context/RegisterContext';
import { useAuth } from '../context/AuthContext';
import tw from 'twrnc';

export default function Home() {
    const router = useRouter();
    const { width } = useWindowDimensions();
    const isSplitView = width > 600; // Lowered from 768 for 8.7-inch tablet optimization
    const { heldOrders, showShiftWarning, setShowShiftWarning } = useCart();

    // UI Preferences via Unified Store Context
    const { settings } = useStore();
    const { role } = useAuth();
    const { showTable, showRecall: showRecallPref, showGuest, showManual } = settings;

    // Responsive Column Calculation
    // Responsive scaling - Dynamic Panel Width
    let panelWidth = 0;
    if (isSplitView) {
        // For tablets, use a percentage or restricted fixed width
        // If width < 900, use smaller 280px, otherwise 350px
        panelWidth = width < 900 ? Math.max(250, width * 0.3) : 350;
    }
    const availableWidth = width - panelWidth;

    let numColumns = 3;
    if (availableWidth > 900) numColumns = 6;
    else if (availableWidth > 700) numColumns = 5;
    else if (availableWidth > 500) numColumns = 4;
    else numColumns = 3;

    // Adjust gridWidth based on panel
    const gridWidth = availableWidth;

    const [products, setProducts] = useState<Product[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(true);
    const [showRecallModal, setShowRecallModal] = useState(false);
    const [showShiftOverlay, setShowShiftOverlay] = useState(true);
    const { isOnline } = useOffline();
    const { activeRegister } = useRegister(); // Import useRegister

    // Add explicit log for debugging
    console.log('[Home] Debug State:', { enforceShift: settings.enforceShift, activeRegister: !!activeRegister });

    useFocusEffect(
        useCallback(() => {
            fetchData();
        }, [])
    );

    useEffect(() => {
        const timer = setTimeout(() => {
            if (loading) {
                console.log('[Home] ⚠️ LOADING TIMEOUT (10s)! Forcing loading = false.');
                setLoading(false);
            }
        }, 10000);

        fetchData().finally(() => clearTimeout(timer));

        // Realtime Subscription
        const productsSubscription = supabase
            .channel('public:products')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'products' },
                (payload) => {
                    console.log('Realtime change:', payload);
                    fetchData(); // Refresh data on any change
                }
            )
            .subscribe();

        const categoriesSubscription = supabase
            .channel('public:categories')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'categories' },
                () => fetchData()
            )
            .subscribe();

        return () => {
            clearTimeout(timer);
            supabase.removeChannel(productsSubscription);
            supabase.removeChannel(categoriesSubscription);
        };
    }, []);

    const fetchData = async () => {
        console.log('[Home] Fetching data... (online:', isOnline, ')');
        try {
            // Try to load from cache first for immediate UI
            const cachedProducts = await AsyncStorage.getItem('cached_products');
            const cachedCategories = await AsyncStorage.getItem('cached_categories');

            if (cachedProducts) setProducts(JSON.parse(cachedProducts));
            if (cachedCategories) setCategories(JSON.parse(cachedCategories));

            // If online, fetch fresh data and update cache
            if (isOnline) {
                console.log('[Home] Online: Fetching fresh products/categories from Supabase');
                // Use a nested try-catch with timeout for the Supabase call
                const fetchPromise = Promise.all([
                    supabase.from('products').select('*').order('name'),
                    supabase.from('categories').select('*').order('name'),
                ]);

                // 8 second timeout specifically for the Supabase query
                const timeoutPromise = new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('Supabase request timeout')), 8000)
                );

                const results = await Promise.race([fetchPromise, timeoutPromise]) as any;
                const [productsRes, categoriesRes] = results;

                if (productsRes.error) throw productsRes.error;
                if (categoriesRes.error) throw categoriesRes.error;

                if (productsRes.data) {
                    console.log(`[Home] Successfully fetched ${productsRes.data.length} products`);
                    setProducts(productsRes.data as Product[]);
                    await AsyncStorage.setItem('cached_products', JSON.stringify(productsRes.data));
                }
                if (categoriesRes.data) {
                    console.log(`[Home] Successfully fetched ${categoriesRes.data.length} categories`);
                    setCategories(categoriesRes.data as Category[]);
                    await AsyncStorage.setItem('cached_categories', JSON.stringify(categoriesRes.data));
                }
            } else {
                console.log('[Home] Offline: Skipping fresh fetch, relying on cache');
            }
        } catch (error) {
            console.error('[Home] Error fetching data:', error);
        } finally {
            console.log('[Home] fetchData finished. Setting loading = false');
            setLoading(false);
        }
    };

    const filteredProducts = products.filter((product) => {
        const matchesCategory = !selectedCategory || product.category_id === selectedCategory;
        const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesCategory && matchesSearch;
    });

    if (loading) {
        return (
            <View style={tw`flex-1 justify-center items-center bg-white`}>
                <ActivityIndicator size="large" color="#2563eb" />
            </View>
        );
    }

    const isCashier = role === 'kasir' || role === 'cashier';
    const isShiftLocked = settings.enforceShift && !activeRegister && isCashier;

    return (
        <View style={tw`flex-1 flex-row bg-gray-50`}>
            {/* Main Content (Products) */}
            <View style={tw`flex-1 flex-col relative`}>
                <Header />

                {/* Search Bar */}
                <View style={tw`bg-white px-3 pb-2`}>
                    <View style={tw`flex-row items-center bg-gray-100 rounded-lg px-3 py-2 border border-gray-200`}>
                        <Search size={20} color="#9ca3af" />
                        <TextInput
                            placeholder="Cari produk..."
                            style={tw`flex-1 ml-2 text-gray-800 font-medium`}
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                            autoCapitalize="none"
                            placeholderTextColor="#9ca3af"
                            editable={!isShiftLocked}
                        />
                        {searchQuery.length > 0 && !isShiftLocked && (
                            <TouchableOpacity onPress={() => setSearchQuery('')}>
                                <X size={18} color="#6b7280" />
                            </TouchableOpacity>
                        )}
                    </View>
                </View>

                {/* Optional Action Bar */}
                {(showTable || showRecallPref || showGuest || showManual || true) && (
                    <View style={tw`bg-white px-3 py-2 flex-row gap-2 flex-wrap`}>

                        {showTable && <TableSelector />}

                        {/* Recall Button */}
                        {showRecallPref && (
                            <TouchableOpacity
                                onPress={() => !isShiftLocked && setShowRecallModal(true)}
                                style={tw`flex-row items-center justify-center bg-orange-50 px-3 py-3 rounded-xl border border-orange-100 relative ${isShiftLocked ? 'opacity-50' : ''}`}
                                disabled={isShiftLocked}
                            >
                                <Archive size={18} color="#d97706" />
                                {heldOrders.length > 0 && (
                                    <View style={tw`absolute -top-1 -right-1 bg-red-500 rounded-full w-4 h-4 items-center justify-center`}>
                                        <Text style={tw`text-[9px] text-white font-bold`}>{heldOrders.length}</Text>
                                    </View>
                                )}
                            </TouchableOpacity>
                        )}

                        {showGuest && <CustomerSelector />}

                        {/* Short-cut to Add Purchase */}
                        <TouchableOpacity
                            onPress={() => !isShiftLocked && router.push('/purchases/add' as any)}
                            style={tw`flex-1 flex-row items-center justify-center bg-orange-100 px-1 py-3 rounded-xl border border-orange-200 ${isShiftLocked ? 'opacity-50' : ''}`}
                            disabled={isShiftLocked}
                        >
                            <ShoppingCart size={16} color="#ea580c" />
                            <Text style={tw`ml-1 font-bold text-orange-700 text-[10px]`} numberOfLines={1}>Beli Stok</Text>
                        </TouchableOpacity>

                        {showManual && <ManualItemModal />}
                    </View>
                )}

                <View style={tw`py-2 bg-white`}>
                    <CategoryFilter
                        categories={categories}
                        selectedCategory={selectedCategory}
                        onSelectCategory={isShiftLocked ? () => { } : setSelectedCategory}
                    />
                </View>

                <FlatList
                    key={isSplitView ? `split-${numColumns}` : `mobile-${numColumns}`}
                    data={isShiftLocked ? [] : filteredProducts}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item }) => <ProductCard product={item} />}
                    numColumns={numColumns}
                    contentContainerStyle={tw`p-3 pb-24`}
                    columnWrapperStyle={tw`justify-between`}
                    ListEmptyComponent={
                        <View style={tw`flex-1 items-center justify-center py-20`}>
                            <Text style={tw`text-gray-500`}>
                                {isShiftLocked ? 'Silakan buka shift kasir terlebih dahulu' : 'Tidak ada produk ditemukan'}
                            </Text>
                        </View>
                    }
                    scrollEnabled={!isShiftLocked}
                />

                {/* Shift Block Overlay */}
                {isShiftLocked && showShiftOverlay && (
                    <View style={tw`absolute top-[56px] bottom-0 left-0 right-0 bg-white/80 z-50 items-center justify-center p-6 mb-24`}>
                        <View style={tw`bg-white p-6 rounded-3xl shadow-xl items-center border border-gray-100 w-full max-w-xs`}>
                            <View style={tw`bg-orange-100 p-4 rounded-full mb-4`}>
                                <ShoppingCart size={32} color="#ea580c" />
                            </View>
                            <Text style={tw`text-xl font-bold text-gray-900 text-center mb-2`}>Shift Belum Dibuka</Text>
                            <Text style={tw`text-gray-500 text-center mb-6 text-sm leading-5`}>
                                Anda wajib membuka shift kasir sebelum dapat melakukan transaksi atau mengelola pesanan.
                            </Text>
                            <TouchableOpacity
                                onPress={() => router.push('/register' as any)}
                                style={tw`bg-blue-600 px-6 py-3 rounded-xl shadow-lg w-full items-center mb-3`}
                            >
                                <Text style={tw`text-white font-bold`}>Buka Shift Sekarang</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={() => setShowShiftOverlay(false)}
                                style={tw`bg-gray-100 px-6 py-3 rounded-xl w-full items-center`}
                            >
                                <Text style={tw`text-gray-600 font-bold`}>Batal</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                )}

                {!isSplitView && !isShiftLocked && <CartFab />}
            </View>

            {/* Right Panel (Cart - Desktop Only) */}
            {isSplitView && (
                <View style={[tw`h-full relative`, { width: panelWidth }]}>
                    <CartPanel />
                    {isShiftLocked && (
                        <View style={tw`absolute inset-0 bg-white/40 z-50`} />
                    )}
                </View>
            )}

            <RecallModal visible={showRecallModal} onClose={() => setShowRecallModal(false)} />

            <ConfirmationModal
                visible={showShiftWarning}
                title="Shift Belum Dibuka"
                message="Anda telah mengaktifkan 'Wajib Buka Shift'. Silakan buka shift kasir terlebih dahulu di menu Kasir untuk dapat melakukan transaksi."
                confirmText="Buka Shift Sekarang"
                cancelText="Batal"
                type="warning"
                onConfirm={() => {
                    setShowShiftWarning(false);
                    router.push('/register' as any);
                }}
                onCancel={() => setShowShiftWarning(false)}
            />
        </View>
    );
}
